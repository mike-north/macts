/**
 * The native macOS executor: the `Executor` that carries out manifest-defined
 * operations by running automation scripts against the target app.
 *
 * It owns three things and nothing else:
 *
 * - composing the script for one operation from the native body (see
 *   `native-scripts.ts`), the app's bundle identifier, and the input record,
 *   without writing any input value into source text;
 * - running it through the {@link NativeTransport}, honoring the time limit and
 *   the caller's abort signal;
 * - classifying native failures into the canonical structured errors from
 *   `@macts/contracts`, in consumer vocabulary.
 *
 * Authorization, policy, and input validation have already happened above the
 * executor seam.
 *
 * Value plans: this executor runs only operations whose values pass through
 * unconverted. Under passthrough the input is plain JSON and the result is
 * whatever the script returns, serialized with plain JSON semantics. An
 * operation with any other plan is refused with `InternalError`, never run with
 * its plan ignored.
 *
 * @packageDocumentation
 */

import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  TargetNotFoundError,
  type AnyMactsError,
  type OperationTarget,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import type { ExecutionRequest, Executor } from '../execution/executor.js'
import { JxaExecutionError, MAX_OUTPUT_BYTES, runJxa } from './executor.js'
import {
  assertRequiredArguments,
  NO_SUCH_OBJECT_ERROR_NUMBER,
  planNativeInvocation,
} from './native-scripts.js'

/** Time limit for one operation when none is configured, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000

/** Limits and cancellation for one {@link NativeTransport.run} call. */
export interface NativeRunOptions {
  /** Time limit in milliseconds. The transport stops the script when it elapses. */
  readonly timeoutMs: number
  /** The transport stops the script when this aborts. */
  readonly signal?: AbortSignal | undefined
}

/**
 * Runs one composed native script and reports how it ended.
 *
 * `run` resolves to the script's parsed JSON result. A failure rejects with a
 * {@link JxaExecutionError}, whose `kind` says whether the script was stopped
 * by the time limit or the caller, could not start, exceeded the output limit,
 * died, or exited with a native error described by `stderr`. The executor
 * classifies failures from those fields alone; any other rejection is a host
 * defect.
 */
export interface NativeTransport {
  /**
   * Run one composed script.
   *
   * @param script - The composed script; see `composeNativeScript`.
   * @param options - The time limit and the caller's abort signal.
   * @returns The script's parsed JSON result. Rejects with a `JxaExecutionError`.
   */
  run(script: string, options: NativeRunOptions): Promise<unknown>
}

/**
 * Configuration for {@link createNativeExecutor}.
 */
export interface NativeExecutorOptions {
  /**
   * Time limit for one operation, in milliseconds. The automation process is
   * stopped when it is exceeded. Defaults to 30000.
   */
  readonly timeoutMs?: number
  /**
   * How scripts are run. Defaults to the macOS automation host; replaceable so
   * the executor can be exercised without one.
   */
  readonly transport?: NativeTransport
}

/**
 * What {@link describeNativeFailure} needs to know about the failed operation.
 */
export interface NativeFailureContext {
  /** Display name of the target app, used in messages and details. */
  readonly app: string
  /** The operation that failed. */
  readonly operation: OperationTarget
  /** The time limit the operation ran under, in milliseconds. */
  readonly timeoutMs: number
}

/**
 * Create the native macOS executor.
 *
 * @remarks
 * Cancellation: an abort before the run starts prevents it. An abort during the
 * run rejects immediately with `OperationCancelledError`, and the transport
 * stops the automation process. Whatever the app had already done by then
 * stays done: whether it completed the operation is unknown after a mid-run
 * abort.
 *
 * @param options - Time limit and, for tests, the transport.
 * @returns An `Executor` whose provider is `'macos'`.
 */
export function createNativeExecutor(options: NativeExecutorOptions = {}): Executor {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const transport = options.transport ?? AUTOMATION_HOST

  return {
    provider: 'macos',
    async execute(request: ExecutionRequest): Promise<WireValue> {
      const { manifest, target, input, inputPlan, outputPlan, signal } = request
      if (inputPlan.kind !== 'passthrough' || outputPlan.kind !== 'passthrough') {
        throw new InternalError(
          'The native executor runs only operations whose values pass through unconverted.',
          {}
        )
      }
      throwIfAborted(signal)

      const plan = planNativeInvocation(manifest, target)
      assertRequiredArguments(plan.requiredArguments, input)
      const script = composeNativeScript(manifest.app.bundleId, plan.body, input)

      const context: NativeFailureContext = { app: manifest.app.name, operation: target, timeoutMs }
      const result = await runCancellable(
        () => transport.run(script, { timeoutMs, signal }),
        context,
        signal
      )
      if (result === undefined) return null
      if (!isWireValue(result)) {
        throw new InternalError('The operation produced a result that is not valid JSON.', {})
      }
      return result
    },
  }
}

/**
 * Compose the script that runs one native body.
 *
 * The input travels as a JSON string literal parsed inside the process. It is
 * never an object literal: a `__proto__` key in an object literal sets the
 * prototype instead of creating a field, while `JSON.parse` always creates an
 * own property. The bundle identifier is likewise embedded as a JSON string
 * literal.
 *
 * The result is a function body: the process boundary wraps it, invokes it,
 * and serializes its return value.
 */
export function composeNativeScript(bundleId: string, body: string, input: WireRecord): string {
  return [
    `var args = JSON.parse(${JSON.stringify(JSON.stringify(input))});`,
    `var app = Application(${JSON.stringify(bundleId)});`,
    'app.includeStandardAdditions = true;',
    'return (function (app, args) {',
    body,
    '})(app, args);',
  ].join('\n')
}

/** The default transport: run a script body in the macOS automation host. */
const AUTOMATION_HOST: NativeTransport = {
  run: (script, options) =>
    runJxa<unknown>(script, { timeout: options.timeoutMs, signal: options.signal }),
}

/** The error for a caller abort. */
function cancelled(): OperationCancelledError {
  return new OperationCancelledError('The operation was cancelled.', {})
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw cancelled()
}

/**
 * Run `start`, classifying its failure, and settle early with
 * `OperationCancelledError` if `signal` aborts first. A late outcome after an
 * abort is discarded.
 */
function runCancellable(
  start: () => Promise<unknown>,
  context: NativeFailureContext,
  signal: AbortSignal | undefined
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      reject(cancelled())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    const settle = (): void => {
      signal?.removeEventListener('abort', onAbort)
    }
    // Starting from a resolved promise turns a synchronous throw into a rejection.
    Promise.resolve()
      .then(start)
      .then(
        (value) => {
          settle()
          resolve(value)
        },
        (error: unknown) => {
          settle()
          reject(signal?.aborted === true ? cancelled() : describeNativeFailure(error, context))
        }
      )
  })
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

/**
 * Native error numbers the executor classifies. Each is the number the
 * automation host prints in parentheses at the end of its error output.
 */
const NativeErrorNumber = {
  /** The addressed object does not exist. Also raised by bodies for a missing target. */
  noSuchObject: NO_SUCH_OBJECT_ERROR_NUMBER,
  /** An index or range selection is invalid for its collection. */
  invalidIndex: -1719,
  /** The operating system has not authorized sending events to the app. */
  notAuthorized: -1743,
  /**
   * The app did not answer an event within its own event timeout, often
   * because a permission prompt is open.
   */
  noReply: -1712,
  /** The app is not running. */
  appNotRunning: -600,
  /** The connection to the app is no longer valid. */
  connectionInvalid: -609,
  /**
   * A script-level error. Reported, among other things, when the app cannot be
   * found, with the text "Application can't be found."
   */
  scriptError: -2700,
  /** The app cannot be found by launch services. */
  appNotFound: -10814,
} as const

/** The trailing `(-NNNN)` the automation host prints after an error message. */
const ERROR_NUMBER_PATTERN = /\((-?\d+)\)\s*$/

/** The host's description of a bundle identifier with no installed app. */
const APP_NOT_FOUND_PATTERN = /Application can.t be found/i

/**
 * Classify a native process failure as a canonical structured error.
 *
 * A {@link JxaExecutionError} is classified by its `kind` first. Only a script
 * that exited with a failure (`kind: 'exited'`) is attributed to the app, by
 * the native error number at the end of its standard error output:
 *
 * - `timed-out` (stopped by the time limit): `OperationTimeoutError`.
 * - `cancelled` (stopped by the caller): `OperationCancelledError`.
 * - `output-too-large`: `InternalError` naming the output limit.
 * - `not-started` (the host could not be started), `signalled` (killed by a
 *   signal macts did not send), `unreadable-output`: `InternalError`.
 * - exited with -1728 (no such object): `TargetNotFoundError`.
 * - exited with -1719 (invalid index): `InvalidSelectionError`.
 * - exited with -1743 (not authorized): `AppAuthorizationRequiredError`.
 * - exited with -600 (not running), -609 (connection invalid), or -1712 (no
 *   answer in time): `AppUnavailableError` (`not-responding`).
 * - exited with -2700 "Application can't be found", or -10814:
 *   `AppUnavailableError` (`not-installed`).
 * - exited with any other number: `AppOperationError` with `appErrorCode`.
 * - exited with no number: `InternalError`.
 * - anything that is not a `JxaExecutionError`: `InternalError`.
 *
 * Host failures are never blamed on the app: a host that cannot start, a
 * process killed from outside, oversized output, and a failure that reports no
 * native error number are macts or system faults, so they are `InternalError`.
 * A missing host is `InternalError` rather than `AppUnavailableError`, because
 * the target app may well be installed; it is the automation host that is
 * unavailable.
 *
 * -1712 is the app's own event timeout, not the executor's time limit, so it is
 * reported as an app that did not respond, with no claim about elapsed time.
 *
 * Messages use consumer vocabulary and may name the app and the resource. The
 * raw failure, including its standard error text, is kept only as `cause`; it
 * never reaches a message or `details`.
 *
 * @param error - What the transport rejected with.
 * @param context - The app and operation, for messages and details.
 * @returns The structured error to throw.
 */
export function describeNativeFailure(
  error: unknown,
  context: NativeFailureContext
): AnyMactsError {
  const { app, timeoutMs } = context
  const options = { cause: error }
  if (!(error instanceof JxaExecutionError)) {
    return new InternalError('The automation host failed unexpectedly.', {}, options)
  }
  switch (error.kind) {
    case 'timed-out':
      return new OperationTimeoutError(
        `${app} did not finish the operation within ${String(timeoutMs)} ms. If this is the first time ${app} is automated on this Mac, it may be waiting for an automation permission prompt to be answered.`,
        { timeoutMs },
        options
      )
    case 'cancelled':
      return new OperationCancelledError('The operation was cancelled.', {}, options)
    case 'output-too-large':
      return new InternalError(
        `The result from ${app} exceeded the ${String(MAX_OUTPUT_BYTES / (1024 * 1024))} MiB output limit.`,
        {},
        options
      )
    case 'not-started':
      return new InternalError('The macOS automation host could not be started.', {}, options)
    case 'signalled':
      return new InternalError('The automation process was stopped unexpectedly.', {}, options)
    case 'unreadable-output':
      return new InternalError('The operation produced output that could not be read.', {}, options)
    case 'exited':
      return describeExitedFailure(error.stderr, context, options)
  }
}

/** Classify a script that exited with a failure, by its native error number. */
function describeExitedFailure(
  stderr: string,
  context: NativeFailureContext,
  options: ErrorOptions
): AnyMactsError {
  const { app, operation } = context
  const resourceDetails = operation.resource === undefined ? {} : { resource: operation.resource }
  const subject = operation.resource ?? 'item'
  const errorNumber = parseNativeErrorNumber(stderr)
  switch (errorNumber) {
    case undefined:
      return new InternalError(
        'The automation process failed without reporting an error.',
        {},
        options
      )
    case NativeErrorNumber.noSuchObject:
      return new TargetNotFoundError(
        `${app} has no ${subject} matching the request.`,
        resourceDetails,
        options
      )
    case NativeErrorNumber.invalidIndex:
      return new InvalidSelectionError(
        `The selection is not valid for the ${subject} collection in ${app}.`,
        resourceDetails,
        options
      )
    case NativeErrorNumber.notAuthorized:
      return new AppAuthorizationRequiredError(
        `This Mac has not authorized automating ${app}. Allow it in System Settings > Privacy & Security > Automation.`,
        { app },
        options
      )
    case NativeErrorNumber.appNotRunning:
    case NativeErrorNumber.connectionInvalid:
      return new AppUnavailableError(
        `${app} is not running or is not responding.`,
        { app, reason: 'not-responding' },
        options
      )
    case NativeErrorNumber.noReply:
      return new AppUnavailableError(
        `${app} did not respond in time. It may be waiting for an automation permission prompt to be answered on this Mac.`,
        { app, reason: 'not-responding' },
        options
      )
    case NativeErrorNumber.appNotFound:
      return notInstalled(app, options)
    case NativeErrorNumber.scriptError:
      if (APP_NOT_FOUND_PATTERN.test(stderr)) return notInstalled(app, options)
      return appOperationFailed(app, errorNumber, options)
    default:
      return appOperationFailed(app, errorNumber, options)
  }
}

function notInstalled(app: string, options: ErrorOptions): AppUnavailableError {
  return new AppUnavailableError(
    `${app} is not installed on this Mac.`,
    { app, reason: 'not-installed' },
    options
  )
}

function appOperationFailed(
  app: string,
  appErrorCode: number,
  options: ErrorOptions
): AppOperationError {
  return new AppOperationError(
    `${app} could not complete the operation (error ${String(appErrorCode)}).`,
    { app, appErrorCode },
    options
  )
}

/** The error number at the end of the host's error output, if any. */
function parseNativeErrorNumber(stderr: string): number | undefined {
  const match = ERROR_NUMBER_PATTERN.exec(stderr.trimEnd())
  const digits = match?.[1]
  return digits === undefined ? undefined : Number(digits)
}

/** Whether `value` is a JSON value, and therefore a wire value under passthrough. */
function isWireValue(value: unknown): value is WireValue {
  if (value === null) return true
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true
    case 'number':
      return Number.isFinite(value)
    case 'object': {
      if (Array.isArray(value)) return value.every(isWireValue)
      const prototype: unknown = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) return false
      return Object.values(value).every(isWireValue)
    }
    default:
      return false
  }
}

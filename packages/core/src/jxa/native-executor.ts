/**
 * The native macOS executor: the `Executor` that carries out manifest-defined
 * operations by running automation scripts against the target app.
 *
 * It owns three things and nothing else:
 *
 * - composing the script for one operation from the native body (see
 *   `native-scripts.ts`), the app's bundle identifier, and the input record,
 *   without writing any input value into source text;
 * - running it through the process boundary, honoring the time limit and the
 *   caller's abort signal;
 * - classifying native failures into the canonical structured errors from
 *   `@macts/contracts`, in consumer vocabulary.
 *
 * Authorization, policy, and input validation have already happened above the
 * executor seam.
 *
 * Value plans: only passthrough plans are accepted. Under passthrough the input
 * is plain JSON and the result is whatever the script returns, serialized with
 * plain JSON semantics. Any other plan needs the in-process value codec, and is
 * refused with `InternalError` rather than silently ignored.
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
import { runJxa } from './executor.js'
import {
  assertRequiredArguments,
  NO_SUCH_OBJECT_ERROR_NUMBER,
  planNativeInvocation,
} from './native-scripts.js'

/** Time limit for one operation when none is configured, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000

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
   * The process boundary: runs one composed script and resolves to its parsed
   * JSON result, or rejects with the process failure. Rejections carry the
   * process's standard error as `stderr`, and a process stopped by the time
   * limit carries `killed: true` (directly or on its `cause`).
   *
   * Defaults to running the script in the macOS automation host. Replaceable so
   * the executor can be tested without one.
   */
  readonly run?: (script: string, options: { readonly timeoutMs: number }) => Promise<unknown>
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
 * run rejects immediately with `OperationCancelledError`, but the automation
 * process is not stopped early: it runs on until it finishes or reaches the
 * time limit, and its outcome is discarded. The default process boundary
 * offers no way to stop a running script, so whether the app completed the
 * operation is unknown after a mid-run abort.
 *
 * @param options - Time limit and, for tests, the process boundary.
 * @returns An `Executor` whose provider is `'macos'`.
 */
export function createNativeExecutor(options: NativeExecutorOptions = {}): Executor {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const run = options.run ?? runInAutomationHost

  return {
    provider: 'macos',
    async execute(request: ExecutionRequest): Promise<WireValue> {
      const { manifest, target, input, inputPlan, outputPlan, signal } = request
      if (inputPlan.kind !== 'passthrough' || outputPlan.kind !== 'passthrough') {
        throw new InternalError(
          'The native executor does not yet support the value contract of this operation.',
          {}
        )
      }
      throwIfAborted(signal)

      const plan = planNativeInvocation(manifest, target)
      assertRequiredArguments(plan.requiredArguments, input)
      const script = composeNativeScript(manifest.app.bundleId, plan.body, input)

      const context: NativeFailureContext = { app: manifest.app.name, operation: target, timeoutMs }
      const result = await runCancellable(() => run(script, { timeoutMs }), context, signal)
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

/** The default process boundary: run a script body in the macOS automation host. */
function runInAutomationHost(script: string, options: { readonly timeoutMs: number }) {
  return runJxa<unknown>(script, { timeout: options.timeoutMs })
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
  /** The app did not answer in time, often because a permission prompt is open. */
  timedOut: -1712,
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
 * @remarks
 * Classification reads the error number at the end of the failure's standard
 * error output, and whether the process was stopped by the time limit:
 *
 * | Native failure                                  | Error                                         |
 * | ----------------------------------------------- | --------------------------------------------- |
 * | stopped by the time limit                       | `OperationTimeoutError`                       |
 * | -1728 (no such object)                          | `TargetNotFoundError`                         |
 * | -1719 (invalid index)                           | `InvalidSelectionError`                       |
 * | -1743 (not authorized)                          | `AppAuthorizationRequiredError`               |
 * | -600 (not running), -609 (connection invalid)   | `AppUnavailableError` (`not-responding`)      |
 * | -2700 "Application can't be found", -10814      | `AppUnavailableError` (`not-installed`)       |
 * | -1712 (the app did not answer in time)          | `OperationTimeoutError`                       |
 * | any other number                                | `AppOperationError` with `appErrorCode`       |
 * | no number                                       | `AppOperationError`                           |
 *
 * Messages use consumer vocabulary and may name the app and the resource. The
 * raw failure, including its standard error text, is kept only as `cause`; it
 * never reaches a message or `details`.
 *
 * @param error - What the process boundary rejected with.
 * @param context - The app and operation, for messages and details.
 * @returns The structured error to throw.
 */
export function describeNativeFailure(
  error: unknown,
  context: NativeFailureContext
): AnyMactsError {
  const { app, operation, timeoutMs } = context
  const options = { cause: error }
  const resourceDetails = operation.resource === undefined ? {} : { resource: operation.resource }
  const subject = operation.resource ?? 'item'

  if (wasStoppedByTimeLimit(error)) {
    return new OperationTimeoutError(
      `${app} did not finish the operation within ${String(timeoutMs)} ms. If this is the first time ${app} is automated on this Mac, it may be waiting for an automation permission prompt to be answered.`,
      { timeoutMs },
      options
    )
  }

  const stderr = readStderr(error)
  const errorNumber = parseNativeErrorNumber(stderr)
  switch (errorNumber) {
    case undefined:
      return new AppOperationError(`${app} could not complete the operation.`, { app }, options)
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
    case NativeErrorNumber.appNotFound:
      return notInstalled(app, options)
    case NativeErrorNumber.scriptError:
      if (APP_NOT_FOUND_PATTERN.test(stderr)) return notInstalled(app, options)
      return appOperationFailed(app, errorNumber, options)
    case NativeErrorNumber.timedOut:
      return new OperationTimeoutError(
        `${app} did not respond in time. It may be waiting for an automation permission prompt to be answered on this Mac.`,
        { timeoutMs },
        options
      )
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

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null
}

/** The standard error text a process failure carries, directly or on its cause. */
function readStderr(error: unknown): string {
  if (!isObject(error)) return ''
  if (typeof error['stderr'] === 'string' && error['stderr'] !== '') return error['stderr']
  const cause = error['cause']
  return isObject(cause) && typeof cause['stderr'] === 'string' ? cause['stderr'] : ''
}

/** Whether the failure is the process being stopped by the time limit. */
function wasStoppedByTimeLimit(error: unknown): boolean {
  if (!isObject(error)) return false
  if (error['killed'] === true) return true
  const cause = error['cause']
  return isObject(cause) && cause['killed'] === true
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

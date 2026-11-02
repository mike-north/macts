/**
 * The native macOS executor: the `Executor` that carries out manifest-defined
 * operations by running automation scripts against the target app.
 *
 * It owns three things and nothing else:
 *
 * - building the `NativeScript` for one operation from the native body (see
 *   `native-scripts.ts`), the app's bundle identifier, the input record, and
 *   the operation's input and output value plans;
 * - running it through the {@link NativeTransport} with the in-process value
 *   codec, honoring the time limit and the caller's abort signal;
 * - classifying failures, whether reported by the automation process as a
 *   `NativeOutcome` or raised by the transport itself, into the
 *   canonical structured errors from `@macts/contracts`, in consumer
 *   vocabulary.
 *
 * Authorization, policy, and input validation have already happened above the
 * executor seam.
 *
 * Value plans: every plan is executed through the codec, which decodes the
 * wire input into native arguments and encodes the native result into wire
 * form inside the automation process. Under passthrough plans the codec
 * converts nothing and plain JSON semantics apply. The executor never converts
 * values itself; the outcome's value is already in wire form.
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
  UnexpectedValueError,
  ValidationError,
  type AnyMactsError,
  type OperationTarget,
  type WireValue,
} from '@macts/contracts'
import type { ExecutionRequest, Executor, ResolutionRequest } from '../execution/executor.js'
import { isWireValue, JxaExecutionError, MAX_OUTPUT_BYTES, runNativeScript } from './executor.js'
import {
  NATIVE_CODEC,
  type NativeFailure,
  type NativeOutcome,
  type NativeScript,
} from './native-codec.js'
import {
  assertRequiredArguments,
  COMMUNICATION_FAILURE_ERROR_NUMBERS,
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
 * Runs one `NativeScript` with the in-process value codec and reports how it
 * ended.
 *
 * `run` resolves to the `NativeOutcome` the automation process reported:
 * everything the app or the codec raised inside the process is a failed
 * outcome, not a rejection. It rejects only when the process itself failed,
 * with a {@link JxaExecutionError} whose `kind` says whether the script was
 * stopped by the time limit or the caller, could not start, exceeded the output
 * limit, died, exited with a native error described by `stderr`, or produced an
 * unreadable outcome. The executor classifies failures from those fields alone;
 * any other rejection is a host defect.
 */
export interface NativeTransport {
  /**
   * Run one native script.
   *
   * @param script - The invocation.
   * @param options - The time limit and the caller's abort signal.
   * @returns What the automation process reported. Rejects with a
   *   `JxaExecutionError`.
   */
  run(script: NativeScript, options: NativeRunOptions): Promise<NativeOutcome>
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
   * How scripts are run. Defaults to the macOS automation host with
   * `NATIVE_CODEC`; replaceable so the executor can be exercised without one.
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
 * Why a native run did not produce a result: either the automation process
 * ran to completion and reported a failed outcome, or the transport rejected
 * and no outcome exists.
 */
export type NativeRunFailure =
  | { readonly kind: 'reported'; readonly failure: NativeFailure }
  | { readonly kind: 'process'; readonly error: unknown }

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
 * Reference resolution: the macOS provider does not resolve references.
 * `resolve` fails every request with `InternalError`, before any automation
 * runs.
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
      throwIfAborted(signal)

      // Legacy identifier aliases belong only to results that pass through
      // unconverted; a typed result contract receives exactly its fields.
      const plan = planNativeInvocation(manifest, target, {
        identifierAliases: outputPlan.kind === 'passthrough',
      })
      assertRequiredArguments(plan.requiredArguments, input)
      const script: NativeScript = {
        bundleId: manifest.app.bundleId,
        body: plan.body,
        input,
        inputPlan,
        outputPlan,
      }

      const context: NativeFailureContext = { app: manifest.app.name, operation: target, timeoutMs }
      const outcome = await runCancellable(
        () => transport.run(script, { timeoutMs, signal }),
        context,
        signal
      )
      if (!outcome.ok) {
        throw describeNativeFailure({ kind: 'reported', failure: outcome.failure }, context)
      }
      // The codec already produced a wire value; this guards a replaced
      // transport that does not honor the outcome contract.
      const value: unknown = outcome.value
      if (value === undefined) return null
      if (!isWireValue(value)) {
        throw new InternalError('The operation produced a result that is not valid JSON.', {})
      }
      return value
    },
    resolve(_request: ResolutionRequest): Promise<WireValue> {
      return Promise.reject(
        new InternalError('The macOS provider does not resolve references.', {})
      )
    },
  }
}

/** The default transport: run a native script in the macOS automation host. */
const AUTOMATION_HOST: NativeTransport = {
  run: (script, options) =>
    runNativeScript(script, NATIVE_CODEC, { timeout: options.timeoutMs, signal: options.signal }),
}

/** The error for a caller abort. */
function cancelled(): OperationCancelledError {
  return new OperationCancelledError('The operation was cancelled.', {})
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw cancelled()
}

/**
 * Run `start`, classifying a rejection as a process failure, and settle early
 * with `OperationCancelledError` if `signal` aborts first. A late outcome after
 * an abort is discarded.
 */
function runCancellable(
  start: () => Promise<NativeOutcome>,
  context: NativeFailureContext,
  signal: AbortSignal | undefined
): Promise<NativeOutcome> {
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
        (outcome) => {
          settle()
          resolve(outcome)
        },
        (error: unknown) => {
          settle()
          reject(
            signal?.aborted === true
              ? cancelled()
              : describeNativeFailure({ kind: 'process', error }, context)
          )
        }
      )
  })
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

/**
 * Native error numbers the executor classifies. Each is the `errorNumber` an
 * app or bridge error carries inside the automation process, which is also the
 * number the host prints in parentheses at the end of an uncaught error.
 */
const NativeErrorNumber = {
  /** The addressed object does not exist. Also raised by bodies for a missing target. */
  noSuchObject: NO_SUCH_OBJECT_ERROR_NUMBER,
  /** An index or range selection is invalid for its collection. */
  invalidIndex: -1719,
  /** The operating system has not authorized sending events to the app. */
  notAuthorized: COMMUNICATION_FAILURE_ERROR_NUMBERS.notAuthorized,
  /**
   * The app did not answer an event within its own event timeout, often
   * because a permission prompt is open.
   */
  noReply: COMMUNICATION_FAILURE_ERROR_NUMBERS.noReply,
  /** The app is not running. */
  appNotRunning: COMMUNICATION_FAILURE_ERROR_NUMBERS.appNotRunning,
  /** The connection to the app is no longer valid. */
  connectionInvalid: COMMUNICATION_FAILURE_ERROR_NUMBERS.connectionInvalid,
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
 * The host's report that a script did not compile, `<start>:<end>: syntax
 * error: ...`. It ends in -2700 like a runtime script error, so it is told
 * apart by this prefix.
 */
const COMPILE_ERROR_PATTERN = /^\s*(?:\d+:\d+:\s*)?syntax error:/m

/**
 * Classify a native failure as a canonical structured error.
 *
 * @remarks
 * A failure the automation process reported in its outcome:
 *
 * | Reported failure                                         | Error                                    |
 * | -------------------------------------------------------- | ---------------------------------------- |
 * | codec, `decode`                                          | `ValidationError` with `issues`          |
 * | codec, `encode`                                          | `UnexpectedValueError` with `issues`     |
 * | app, -1728 (no such object)                              | `TargetNotFoundError`                    |
 * | app, -1719 (invalid index)                               | `InvalidSelectionError`                  |
 * | app, -1743 (not authorized)                              | `AppAuthorizationRequiredError`          |
 * | app, -600 (not running), -609 (connection invalid)       | `AppUnavailableError` (`not-responding`) |
 * | app, -1712 (no answer within the app's event timeout)    | `AppUnavailableError` (`not-responding`) |
 * | app, -2700 "Application can't be found", -10814          | `AppUnavailableError` (`not-installed`)  |
 * | app, any other number                                    | `AppOperationError` with `appErrorCode`  |
 * | app, no number                                           | `AppOperationError`                      |
 *
 * A decode failure means a bridge form could not be produced from input that
 * was already validated against its wire schema; it is still reported as the
 * input not meeting the contract. Codec `path` and `message` are written by
 * macts and describe the contract, so they become the error's `issues`.
 *
 * A failure of the transport, with no outcome, by the rejection's `kind`:
 *
 * | Process failure                                          | Error                                    |
 * | -------------------------------------------------------- | ---------------------------------------- |
 * | `timed-out` (the transport's own time limit)             | `OperationTimeoutError`                  |
 * | `cancelled` (stopped by the caller)                      | `OperationCancelledError`                |
 * | `output-too-large`                                       | `InternalError` naming the output limit  |
 * | `not-started`, `signalled`, `unreadable-output`          | `InternalError`                          |
 * | `exited`, the script did not compile                     | `InternalError`                          |
 * | `exited`, standard error ends in an error number         | the app table above, by that number      |
 * | `exited`, no error number                                | `InternalError`                          |
 * | anything that is not a `JxaExecutionError`               | `InternalError`                          |
 *
 * Only the transport's own time limit makes a process failure a timeout: a
 * process killed by an out-of-memory kill, the output limit, or an external
 * signal is not one. Host failures are never blamed on the app: a host that
 * cannot start (reported as `InternalError` rather than `AppUnavailableError`,
 * since the target app may well be installed), a process killed from outside,
 * oversized output, a script that does not compile, and a malformed outcome
 * are macts or system faults.
 *
 * -1712 is the app's own event timeout, not the executor's time limit, so it is
 * reported as an app that did not respond, with no claim about elapsed time.
 *
 * Messages use consumer vocabulary and may name the app and the resource.
 * App-supplied text (an app failure's message, the process's standard error)
 * never reaches a message or `details`: it is kept only as `cause`, either as
 * the process failure itself or as an `Error` whose message is the app text.
 *
 * @param failure - The reported failure, or what the process boundary rejected
 *   with.
 * @param context - The app and operation, for messages and details.
 * @returns The structured error to throw.
 */
export function describeNativeFailure(
  failure: NativeRunFailure,
  context: NativeFailureContext
): AnyMactsError {
  return failure.kind === 'reported'
    ? describeReportedFailure(failure.failure, context)
    : describeProcessFailure(failure.error, context)
}

function describeReportedFailure(
  failure: NativeFailure,
  context: NativeFailureContext
): AnyMactsError {
  const { app } = context
  if (failure.source === 'codec') {
    const issues = [{ path: failure.path, message: failure.message }]
    return failure.direction === 'encode'
      ? new UnexpectedValueError(
          `${app} returned a value that does not match the operation's contract.`,
          { issues }
        )
      : new ValidationError(`The input could not be converted to the values ${app} expects.`, {
          issues,
        })
  }
  const options = { cause: new Error(failure.message) }
  if (failure.errorNumber === undefined) {
    return new AppOperationError(`${app} could not complete the operation.`, { app }, options)
  }
  return classifyErrorNumber(failure.errorNumber, failure.message, context, options)
}

function describeProcessFailure(error: unknown, context: NativeFailureContext): AnyMactsError {
  const { app, timeoutMs } = context
  const options = { cause: error }
  if (!(error instanceof JxaExecutionError)) {
    return new InternalError(`The automation for ${app} failed unexpectedly.`, {}, options)
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
      return new InternalError(`The automation for ${app} was stopped unexpectedly.`, {}, options)
    case 'unreadable-output':
      return new InternalError(
        `The automation for ${app} reported a result macts could not read.`,
        {},
        options
      )
    case 'exited': {
      if (COMPILE_ERROR_PATTERN.test(error.stderr)) {
        return new InternalError(`The automation for ${app} could not be prepared.`, {}, options)
      }
      const errorNumber = parseNativeErrorNumber(error.stderr)
      if (errorNumber === undefined) {
        return new InternalError(
          `The automation for ${app} failed without reporting an error.`,
          {},
          options
        )
      }
      return classifyErrorNumber(errorNumber, error.stderr, context, options)
    }
  }
}

/**
 * Classify a native error number by the error table above. `text` is the host's or the
 * app's description of the failure; it is read only to recognize a missing
 * app behind the generic -2700 number, and never copied into the result.
 */
function classifyErrorNumber(
  errorNumber: number,
  text: string,
  context: NativeFailureContext,
  options: ErrorOptions
): AnyMactsError {
  const { app, operation } = context
  const resourceDetails = operation.resource === undefined ? {} : { resource: operation.resource }
  const subject = operation.resource ?? 'item'

  switch (errorNumber) {
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
      if (APP_NOT_FOUND_PATTERN.test(text)) return notInstalled(app, options)
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

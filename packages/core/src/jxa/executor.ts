/**
 * The process boundary to the macOS automation host (`osascript -l
 * JavaScript`).
 *
 * Two entry points share one transport:
 *
 * - {@link runJxa} and {@link runWithApp} run a raw script body and parse its
 *   return value with plain JSON semantics. They serve the low-level bridge
 *   (connections, object specifiers, and the generated RPC layer).
 * - {@link runNativeScript} runs one {@link NativeScript} with a
 *   {@link NativeCodec}: the wire input is decoded inside the process, the body
 *   runs against the target app, and its result is encoded to wire form before
 *   serialization, so numeric classification, special doubles, and dates
 *   survive. The process reports a {@link NativeOutcome}, which this module
 *   validates structurally before handing it on.
 *
 * The transport starts the host from an argument vector and writes the script
 * to its standard input, so no script text ever crosses a shell. It owns the
 * time limit, the caller's abort signal, and the output limit, and it reports
 * every process failure as a {@link JxaExecutionError} whose `kind` says what
 * happened. Only this module knows how child processes fail; callers classify
 * failures by `kind` and never by Node's child-process error shape. A process
 * the transport stops because the time limit elapsed is the only timeout; a
 * process that dies from any other cause, including a signal sent by someone
 * else, is not one.
 *
 * The composed native script is the per-call form for this one-process-per-call
 * transport. The codec prelude, the native bodies, and `NativeOutcome` do not
 * depend on it: the script reaches the codec only through its exported binding
 * names, and embeds input and plans as text only because this transport sends
 * source text.
 *
 * This module knows process execution and script composition, not value
 * conversion (the codec's concern) or canonical error classification (the
 * native executor's concern).
 *
 * @packageDocumentation
 */

import { execFile } from 'node:child_process'
import type { IssuePath, WireValue } from '@macts/contracts'
import {
  NATIVE_CODEC_ERROR_NAME,
  NATIVE_COLLECTION_CHANGED_ERROR_NAME,
  NATIVE_DECODE_FUNCTION,
  NATIVE_ENCODE_FUNCTION,
  NATIVE_READING_KEY,
  type NativeCodec,
  type NativeFailure,
  type NativeOutcome,
  type NativeScript,
} from './native-codec.js'

/** Time limit for one script when none is given, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30000

/**
 * The most output, in bytes, read from the automation process on each of
 * standard output and standard error.
 *
 * A list result carries every item's properties in one JSON document, so it
 * grows with the collection: a large mailbox or photo library produces tens of
 * megabytes. The whole document is held in memory before it is parsed, so the
 * limit bounds the memory one call can take. A process that exceeds it is
 * stopped and the call fails with `kind: 'output-too-large'`; it is never
 * truncated.
 */
export const MAX_OUTPUT_BYTES = 64 * 1024 * 1024

/** Options for {@link runJxa} and {@link runWithApp}. */
export interface JxaExecutorOptions {
  /** Time limit in milliseconds. Defaults to 30000; `0` disables the limit. */
  timeout?: number
  /** Optional callback for stderr output. Defaults to console.warn if not provided. */
  onStderr?: (msg: string) => void
  /**
   * Stops the automation process when it aborts. The call then fails with
   * `kind: 'cancelled'`; an already-aborted signal prevents the process from
   * starting.
   */
  signal?: AbortSignal | undefined
  /**
   * The most output, in bytes, read on each of standard output and standard
   * error before the process is stopped. Defaults to {@link MAX_OUTPUT_BYTES}.
   */
  maxOutputBytes?: number
}

/**
 * Why a call to the automation host failed.
 *
 * - `timed-out`: the transport stopped the process because its time limit
 *   elapsed. This is the only kind that means a timeout.
 * - `cancelled`: the transport stopped the process because the caller's signal
 *   aborted, or did not start it because the signal had already aborted.
 * - `output-too-large`: the process wrote more than its output limit (by
 *   default {@link MAX_OUTPUT_BYTES}) and was stopped.
 * - `not-started`: the host process could not be started at all (it is
 *   missing, or the system refused to spawn it).
 * - `signalled`: the process was killed by a signal the transport did not send.
 * - `exited`: the process exited with a failure status. `stderr` describes the
 *   failure, normally ending in the native error number.
 * - `unreadable-output`: the process exited normally, but its output is not the
 *   document the caller expected (JSON, or a well-formed native outcome).
 */
export type JxaFailureKind =
  | 'timed-out'
  | 'cancelled'
  | 'output-too-large'
  | 'not-started'
  | 'signalled'
  | 'exited'
  | 'unreadable-output'

/** Additional facts about a {@link JxaExecutionError}. */
export interface JxaExecutionErrorOptions {
  /** What happened. Defaults to `'exited'`. */
  readonly kind?: JxaFailureKind
}

/**
 * A failure at the automation-host process boundary: the process could not be
 * started, exited with an error, was stopped, or produced output that could not
 * be read.
 */
export class JxaExecutionError extends Error {
  /** The child-process error code or exit code, as text; `'UNKNOWN'` when absent. */
  public readonly code: string
  /** What the process wrote to standard error, possibly empty. */
  public readonly stderr: string
  /** What happened; see {@link JxaFailureKind}. */
  public readonly kind: JxaFailureKind
  /**
   * `true` only when the transport itself stopped the process because the time
   * limit it was given elapsed. A process killed by any other signal (an
   * out-of-memory kill, an external `kill`, the output limit) is not a timeout.
   */
  public readonly timedOut: boolean

  constructor(
    message: string,
    code: string,
    stderr: string,
    cause?: unknown,
    options: JxaExecutionErrorOptions = {}
  ) {
    super(message)
    this.name = 'JxaExecutionError'
    this.code = code
    this.stderr = stderr
    this.kind = options.kind ?? 'exited'
    this.timedOut = this.kind === 'timed-out'
    // Set cause if provided (ES2022 feature)
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

/**
 * Execute raw JXA code and return the result.
 * Uses osascript -l JavaScript under the hood.
 */
export async function runJxa<T>(code: string, options: JxaExecutorOptions = {}): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    onStderr,
    signal,
    maxOutputBytes = MAX_OUTPUT_BYTES,
  } = options

  // Wrap code to JSON-stringify the result for parsing
  const wrappedCode = `
    ObjC.import('stdlib');
    var result = (function() { ${code} })();
    JSON.stringify(result);
  `

  const { stdout, stderr } = await runAutomationProcess(wrappedCode, {
    timeout,
    signal,
    maxOutputBytes,
  })
  try {
    if (stderr) {
      if (onStderr) {
        onStderr(stderr)
      } else {
        console.warn('JXA stderr:', stderr)
      }
    }

    // Parse JSON result
    const trimmed = stdout.trim()
    if (!trimmed) {
      return undefined as T
    }
    return JSON.parse(trimmed) as T
  } catch (error) {
    throw new JxaExecutionError(
      'JXA execution failed: the output is not valid JSON',
      'UNKNOWN',
      stderr,
      error,
      { kind: 'unreadable-output' }
    )
  }
}

/**
 * Execute JXA code in the context of an application.
 */
export async function runWithApp<T>(
  bundleId: string,
  fn: string, // Function body as string
  options: JxaExecutorOptions = {}
): Promise<T> {
  // The bundle identifier is embedded as a JSON string literal so it can never
  // terminate the literal or inject code, whatever characters it contains.
  const code = `
    var app = Application(${JSON.stringify(bundleId)});
    app.includeStandardAdditions = true;
    return (function(app) { ${fn} })(app);
  `
  return runJxa<T>(code, options)
}

/** Options for {@link runNativeScript}. */
export interface RunNativeScriptOptions {
  /** Time limit in milliseconds. Defaults to 30000; `0` disables the limit. */
  readonly timeout?: number
  /** Stops the automation process when it aborts; see {@link JxaExecutorOptions.signal}. */
  readonly signal?: AbortSignal | undefined
  /** Output limit in bytes per stream. Defaults to {@link MAX_OUTPUT_BYTES}. */
  readonly maxOutputBytes?: number
}

/**
 * Run one native invocation in the automation host, converting values through
 * `codec` inside the process.
 *
 * @remarks
 * The script decodes `script.input` against `script.inputPlan`, invokes
 * `script.body` as `(app, args, page)` with the target application, encodes the
 * result against `script.outputPlan`, and reports a {@link NativeOutcome}.
 * Everything the app or the codec raises inside the process resolves as a
 * failed outcome; it is not a rejection. A success whose value was dropped by
 * serialization (a passthrough body returning `undefined`) resolves with
 * `value: null`. Standard error output of a successful run is not reported.
 *
 * Rejections are always a {@link JxaExecutionError}, whose `kind` says what
 * happened (see {@link JxaFailureKind}). A script that did not compile exits
 * with a failure (`kind: 'exited'`); output that is not a well-formed outcome
 * is `kind: 'unreadable-output'`.
 *
 * @param script - The invocation. No value in it is ever written into source
 *   text as code.
 * @param codec - The in-process value codec.
 * @param options - Time limit, abort signal, and output limit.
 * @returns What the automation process reported.
 */
export async function runNativeScript(
  script: NativeScript,
  codec: NativeCodec,
  options: RunNativeScriptOptions = {}
): Promise<NativeOutcome> {
  const { stdout, stderr } = await runAutomationProcess(composeNativeScript(script, codec), {
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    signal: options.signal,
    maxOutputBytes: options.maxOutputBytes ?? MAX_OUTPUT_BYTES,
  })
  const outcome = parseNativeOutcome(stdout)
  if (typeof outcome === 'string') {
    throw new JxaExecutionError(
      `The automation process produced a malformed outcome: ${outcome}`,
      'UNKNOWN',
      stderr,
      undefined,
      { kind: 'unreadable-output' }
    )
  }
  return outcome
}

// ---------------------------------------------------------------------------
// Native script composition
// ---------------------------------------------------------------------------

/**
 * A value embedded as data: a JSON string literal parsed inside the process.
 * It is never an object literal, because a `__proto__` key in an object literal
 * sets the prototype instead of creating a field, while `JSON.parse` always
 * creates an own property.
 */
function embedJson(value: unknown): string {
  return `JSON.parse(${JSON.stringify(JSON.stringify(value))})`
}

/**
 * The catch clause of a native script: describes what was thrown as a
 * {@link NativeFailure}. A codec error, recognized by its marker name, keeps its
 * direction, path, message, and its unsupported kind or missing resource if it
 * has one; a changed collection, recognized by its marker name, keeps its
 * message; anything else
 * is an app or bridge failure that keeps its message and, when it carries one,
 * its numeric error code, the resource of the object found missing, and what
 * was being read when the app failed ({@link NATIVE_READING_KEY}).
 */
const DESCRIBE_THROWN = [
  `    if (e !== null && typeof e === 'object' && e.name === ${JSON.stringify(NATIVE_CODEC_ERROR_NAME)}) {`,
  "      var codecFailure = { source: 'codec', direction: e.direction, path: e.path, message: e.message };",
  "      if (typeof e.unsupportedKind === 'string') {",
  '        codecFailure.unsupportedKind = e.unsupportedKind;',
  '      }',
  "      if (typeof e.missingResource === 'string') {",
  '        codecFailure.missingResource = e.missingResource;',
  '      }',
  '      return { ok: false, failure: codecFailure };',
  '    }',
  `    if (e !== null && typeof e === 'object' && e.name === ${JSON.stringify(NATIVE_COLLECTION_CHANGED_ERROR_NAME)}) {`,
  "      return { ok: false, failure: { source: 'collection', message: String(e.message) } };",
  '    }',
  "    var failure = { source: 'app', message: String(e && e.message || e) };",
  "    if (e !== null && e !== undefined && typeof e.errorNumber === 'number') {",
  '      failure.errorNumber = e.errorNumber;',
  '    }',
  "    if (e !== null && e !== undefined && typeof e.missingResource === 'string') {",
  '      failure.missingResource = e.missingResource;',
  '    }',
  `    if (e !== null && e !== undefined && typeof e[${JSON.stringify(NATIVE_READING_KEY)}] === 'string') {`,
  `      failure.reading = e[${JSON.stringify(NATIVE_READING_KEY)}];`,
  '    }',
  '    return { ok: false, failure: failure };',
].join('\n')

/**
 * Compose the automation-process script for one native invocation.
 *
 * The script imports the C standard library bridge, declares the codec's
 * functions, and evaluates one try/catch that yields a {@link NativeOutcome};
 * its final expression is that outcome serialized as JSON, which the host
 * prints. The input, both plans, and the reference table are embedded as JSON
 * text parsed inside the process, the bundle identifier as a JSON string literal, and the
 * body inside its own `(function (app, args, page) { ... })`, called with the
 * page window (or `null`) embedded the same way.
 *
 * The application object comes first, because finding a referenced object
 * needs it: the codec functions receive `{ app, references }`. Nothing else
 * reaches the app until the whole input has converted: decoding converts every
 * value before it uses the app to find referenced objects, and the body runs
 * after that. So an input value that cannot convert fails before the app
 * receives any event.
 *
 * {@link runNativeScript} runs this program in the automation host. Tests
 * that evaluate the program elsewhere reach this function through the
 * internal `@macts/core/testing` entry; it is not public API.
 */
export function composeNativeScript(script: NativeScript, codec: NativeCodec): string {
  return [
    "ObjC.import('stdlib');",
    codec.prelude,
    'var __mactsOutcome = (function () {',
    '  try {',
    `    var app = Application(${JSON.stringify(script.bundleId)});`,
    '    app.includeStandardAdditions = true;',
    `    var env = { app: app, references: ${embedJson(script.references)} };`,
    `    var args = ${NATIVE_DECODE_FUNCTION}(${embedJson(script.input)}, ${embedJson(script.inputPlan)}, env);`,
    '    var value = (function (app, args, page) {',
    script.body,
    `    })(app, args, ${embedJson(script.page ?? null)});`,
    `    return { ok: true, value: ${NATIVE_ENCODE_FUNCTION}(value, ${embedJson(script.outputPlan)}, env) };`,
    '  } catch (e) {',
    DESCRIBE_THROWN,
    '  }',
    '})();',
    'JSON.stringify(__mactsOutcome);',
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Outcome parsing
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIssuePath(value: unknown): value is IssuePath {
  return (
    Array.isArray(value) &&
    value.every((step) => typeof step === 'string' || typeof step === 'number')
  )
}

/**
 * Whether `value` is a JSON value, and therefore structurally a wire value:
 * finite numbers only, and plain objects only.
 */
export function isWireValue(value: unknown): value is WireValue {
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

/** The failure half of an outcome, or a description of why it is malformed. */
function parseNativeFailure(value: unknown): NativeFailure | string {
  if (!isRecord(value) || typeof value['message'] !== 'string') {
    return 'the failure has no message'
  }
  const message = value['message']
  switch (value['source']) {
    case 'app': {
      const errorNumber = value['errorNumber']
      const missingResource = value['missingResource']
      const reading = value['reading']
      if (errorNumber !== undefined && typeof errorNumber !== 'number') {
        return 'the app failure has a non-numeric error number'
      }
      if (missingResource !== undefined && typeof missingResource !== 'string') {
        return 'the app failure has a non-text missing resource'
      }
      if (reading !== undefined && typeof reading !== 'string') {
        return 'the app failure has a non-text reading'
      }
      return {
        source: 'app',
        message,
        ...(errorNumber === undefined ? {} : { errorNumber }),
        ...(missingResource === undefined ? {} : { missingResource }),
        ...(reading === undefined ? {} : { reading }),
      }
    }
    case 'collection':
      return { source: 'collection', message }
    case 'codec': {
      const direction = value['direction']
      const path = value['path']
      if (direction !== 'decode' && direction !== 'encode') {
        return 'the codec failure has no direction'
      }
      if (!isIssuePath(path)) return 'the codec failure has no path'
      const unsupportedKind = value['unsupportedKind']
      const missingResource = value['missingResource']
      if (unsupportedKind !== undefined && typeof unsupportedKind !== 'string') {
        return 'the codec failure has a non-text unsupported kind'
      }
      if (missingResource !== undefined && typeof missingResource !== 'string') {
        return 'the codec failure has a non-text missing resource'
      }
      if (unsupportedKind !== undefined && missingResource !== undefined) {
        return 'the codec failure is both unsupported and missing'
      }
      return {
        source: 'codec',
        direction,
        path,
        message,
        ...(unsupportedKind === undefined ? {} : { unsupportedKind }),
        ...(missingResource === undefined ? {} : { missingResource }),
      }
    }
    default:
      return 'the failure has an unknown source'
  }
}

/**
 * Read the outcome a composed native script printed (see
 * {@link composeNativeScript}): the {@link NativeOutcome}, or a description of
 * why the output is malformed. The description never quotes the output, which
 * may hold app data. Like {@link composeNativeScript}, it is reached by tests
 * through the internal `@macts/core/testing` entry and is not public API.
 */
export function parseNativeOutcome(stdout: string): NativeOutcome | string {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout.trim())
  } catch {
    return 'the output is not JSON'
  }
  if (!isRecord(parsed)) return 'the output is not an object'
  if (parsed['ok'] === true) {
    // A success whose value is `undefined` (a passthrough body returning
    // nothing) loses the key in serialization; it stands for no value.
    const value = parsed['value'] ?? null
    if (!isWireValue(value)) return 'the value is not JSON'
    return { ok: true, value }
  }
  if (parsed['ok'] === false) {
    const failure = parseNativeFailure(parsed['failure'])
    return typeof failure === 'string' ? failure : { ok: false, failure }
  }
  return 'the output has no ok flag'
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/** Limits and cancellation for one {@link runAutomationProcess} call. */
interface AutomationProcessOptions {
  /** Time limit in milliseconds; `0` disables it. */
  readonly timeout: number
  /** Stops the process when it aborts. */
  readonly signal?: AbortSignal | undefined
  /** Output limit in bytes for each of standard output and standard error. */
  readonly maxOutputBytes: number
}

/**
 * Run a script in the automation host and collect its output.
 *
 * The script is written to the process's standard input and the host is
 * started directly from an argument vector, never through a shell. Script
 * text, and therefore every value embedded in it, reaches the host byte for
 * byte: no shell quoting or escape processing applies, so no value can
 * terminate a string literal and become code.
 *
 * The time limit and the abort signal are enforced here rather than by
 * `execFile`, so the rejection can say which of them stopped the process. Each
 * is recorded only when this transport actually delivered the stop signal.
 *
 * Failures reject with a {@link JxaExecutionError} whose `cause` is the
 * child-process error.
 */
function runAutomationProcess(
  script: string,
  options: AutomationProcessOptions
): Promise<{ stdout: string; stderr: string }> {
  const { timeout, signal, maxOutputBytes } = options
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(
        new JxaExecutionError(
          'JXA execution was cancelled before it started',
          'ABORT_ERR',
          '',
          undefined,
          {
            kind: 'cancelled',
          }
        )
      )
      return
    }
    let stoppedBy: 'timed-out' | 'cancelled' | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const onAbort = (): void => {
      if (child.kill()) stoppedBy ??= 'cancelled'
    }
    const child = execFile(
      'osascript',
      ['-l', 'JavaScript'],
      { encoding: 'utf8', maxBuffer: maxOutputBytes },
      (error, stdout, stderr) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        if (error) {
          // The child-process error is an Error instance whose declared type
          // is derived with Omit, so it is widened to Error for the cause.
          // The object itself (with code, killed, signal, stderr) is unchanged.
          const failure: Error = Object.assign(error, { stderr })
          reject(
            new JxaExecutionError(
              `JXA execution failed: ${error.message}`,
              String(error.code ?? 'UNKNOWN'),
              stderr,
              failure,
              { kind: stoppedBy ?? failureKind(error) }
            )
          )
          return
        }
        resolve({ stdout, stderr })
      }
    )
    if (timeout > 0) {
      timer = setTimeout(() => {
        if (child.kill()) stoppedBy ??= 'timed-out'
      }, timeout)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    // If the process exits before draining a large script (a timeout kill,
    // say), writing to its closed stdin raises EPIPE. The exit is already
    // reported through the callback above; without a listener the write
    // error would be unhandled and crash the host process.
    child.stdin?.on('error', () => undefined)
    child.stdin?.end(script, 'utf8')
  })
}

/** Node's error code when a child's output exceeds `maxBuffer`. */
const MAX_BUFFER_EXCEEDED = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'

/**
 * The kind of a child-process failure this transport did not cause itself.
 */
function failureKind(error: {
  readonly code?: string | number | null | undefined
  readonly signal?: NodeJS.Signals | null | undefined
  readonly syscall?: string | undefined
}): JxaFailureKind {
  if (error.code === MAX_BUFFER_EXCEEDED) return 'output-too-large'
  if (typeof error.syscall === 'string' && error.syscall.startsWith('spawn')) return 'not-started'
  if (typeof error.signal === 'string') return 'signalled'
  return 'exited'
}

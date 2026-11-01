/**
 * The process boundary to the macOS automation host (`osascript -l
 * JavaScript`).
 *
 * The transport starts the host from an argument vector and writes the script
 * to its standard input, so no script text ever crosses a shell. It owns the
 * time limit, the caller's abort signal, and the output limit, and it reports
 * every process failure as a {@link JxaExecutionError} whose `kind` says what
 * happened. Only this module knows how child processes fail; callers classify
 * failures by `kind` and never by Node's child-process error shape.
 *
 * It knows process execution, not canonical error classification (the native
 * executor's concern).
 *
 * @packageDocumentation
 */

import { execFile } from 'node:child_process'

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
 *   JSON document the caller expected.
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

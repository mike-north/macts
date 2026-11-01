import { execFile } from 'node:child_process'

export interface JxaExecutorOptions {
  timeout?: number // milliseconds
  /** Optional callback for stderr output. Defaults to console.warn if not provided. */
  onStderr?: (msg: string) => void
}

export class JxaExecutionError extends Error {
  public readonly code: string
  public readonly stderr: string

  constructor(message: string, code: string, stderr: string, cause?: unknown) {
    super(message)
    this.name = 'JxaExecutionError'
    this.code = code
    this.stderr = stderr
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
  const { timeout = 30000, onStderr } = options

  // Wrap code to JSON-stringify the result for parsing
  const wrappedCode = `
    ObjC.import('stdlib');
    var result = (function() { ${code} })();
    JSON.stringify(result);
  `

  try {
    const { stdout, stderr } = await runOsascript(wrappedCode, timeout)

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
    const e = error as { code?: string; stderr?: string; message?: string }
    throw new JxaExecutionError(
      `JXA execution failed: ${e.message ?? 'Unknown error'}`,
      e.code ?? 'UNKNOWN',
      e.stderr ?? '',
      error
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

/**
 * Run a script in the automation host and collect its output.
 *
 * The script is written to the process's standard input and the host is
 * started directly from an argument vector, never through a shell. Script
 * text, and therefore every value embedded in it, reaches the host byte for
 * byte: no shell quoting or escape processing applies, so no value can
 * terminate a string literal and become code.
 *
 * Failures reject with the child-process error (carrying `code`, `killed`,
 * `signal`, and `stderr`), matching what callers already inspect.
 */
function runOsascript(
  script: string,
  timeout: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'osascript',
      ['-l', 'JavaScript'],
      { timeout, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stderr }))
          return
        }
        resolve({ stdout, stderr })
      }
    )
    child.stdin?.end(script, 'utf8')
  })
}

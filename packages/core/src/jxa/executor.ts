import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface JxaExecutorOptions {
  timeout?: number; // milliseconds
}

export class JxaExecutionError extends Error {
  public readonly code: string;
  public readonly stderr: string;

  constructor(message: string, code: string, stderr: string, cause?: unknown) {
    super(message);
    this.name = 'JxaExecutionError';
    this.code = code;
    this.stderr = stderr;
    // Set cause if provided (ES2022 feature)
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Execute raw JXA code and return the result.
 * Uses osascript -l JavaScript under the hood.
 */
export async function runJxa<T>(code: string, options: JxaExecutorOptions = {}): Promise<T> {
  const { timeout = 30000 } = options;

  // Wrap code to JSON-stringify the result for parsing
  const wrappedCode = `
    ObjC.import('stdlib');
    var result = (function() { ${code} })();
    JSON.stringify(result);
  `;

  try {
    const { stdout, stderr } = await execAsync(
      `osascript -l JavaScript -e ${escapeShellArg(wrappedCode)}`,
      { timeout }
    );

    if (stderr) {
      console.warn('JXA stderr:', stderr);
    }

    // Parse JSON result
    const trimmed = stdout.trim();
    if (!trimmed) {
      return undefined as T;
    }
    return JSON.parse(trimmed) as T;
  } catch (error) {
    const e = error as { code?: string; stderr?: string; message?: string };
    throw new JxaExecutionError(
      `JXA execution failed: ${e.message ?? 'Unknown error'}`,
      e.code ?? 'UNKNOWN',
      e.stderr ?? '',
      error
    );
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
  const code = `
    var app = Application("${bundleId}");
    app.includeStandardAdditions = true;
    return (function(app) { ${fn} })(app);
  `;
  return runJxa<T>(code, options);
}

/**
 * Escape a string for shell argument.
 */
function escapeShellArg(arg: string): string {
  // Use $'...' syntax for proper escaping
  return "$'" + arg.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

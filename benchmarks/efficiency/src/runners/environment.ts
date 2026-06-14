/**
 * Live-environment preconditions shared by the real runners.
 *
 * Both `RawComputerUseRunner` and `MactsRunner` can only execute against a live
 * Mac with the target apps installed, plus model credentials (and, for macts,
 * the API server). This module centralizes the precondition check and the
 * documented error thrown when it is not met, so the harness records a clean
 * failure rather than crashing.
 *
 * @packageDocumentation
 */

/** Thrown when a runner is invoked without its required live environment. */
export class LiveEnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LiveEnvironmentError'
  }
}

/**
 * Credentials and endpoints a real runner needs at execution time.
 *
 * @remarks
 * Resolved from the process environment by {@link resolveLiveConfig}. Kept as a
 * plain interface so tests can construct one directly and so the shape is the
 * single source of truth for what a live run requires.
 */
export interface LiveConfig {
  /** API key for the computer-use / agent model (token + turn accounting). */
  readonly modelApiKey: string
  /** macts API server base URL (the macts path calls typed SDKs against it). */
  readonly mactsBaseUrl: string
  /** macts API key authorizing the scoped capabilities under test. */
  readonly mactsApiKey: string
}

/** Environment variable names the runners read. Documented in the README. */
export const ENV = {
  modelApiKey: 'BENCH_MODEL_API_KEY',
  mactsBaseUrl: 'MACTS_BASE_URL',
  mactsApiKey: 'MACTS_API_KEY',
} as const

/**
 * Resolve a {@link LiveConfig} from a process-environment-like record.
 *
 * @param env - typically `process.env`
 * @returns the resolved config
 * @throws LiveEnvironmentError listing every missing variable, so an operator
 *   sees all gaps at once instead of one at a time.
 */
export function resolveLiveConfig(env: Record<string, string | undefined>): LiveConfig {
  const missing: string[] = []
  const modelApiKey = env[ENV.modelApiKey]
  const mactsApiKey = env[ENV.mactsApiKey]
  const mactsBaseUrl = env[ENV.mactsBaseUrl] ?? 'http://localhost:8372'

  if (!modelApiKey) missing.push(ENV.modelApiKey)
  if (!mactsApiKey) missing.push(ENV.mactsApiKey)

  if (missing.length > 0 || modelApiKey === undefined || mactsApiKey === undefined) {
    throw new LiveEnvironmentError(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'The real benchmark runners require a live Mac, the macts API server, and model credentials. ' +
        'See benchmarks/efficiency/README.md.'
    )
  }

  return { modelApiKey, mactsBaseUrl, mactsApiKey }
}

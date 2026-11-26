/** Bounded consumer processes for tests that exercise the built runtime. */
import { execFile } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { childEnvironment } from './keys/child-environment.js'

/** Gives each consumer enough time for the store's bounded lock waits. */
export const TEST_CHILD_TIMEOUT_MS = 30000

/** Accommodates sequential consumers and cleanup after a child failure. */
export const PROCESS_UAT_TIMEOUT_MS = 180000

/** Captured output remains available for assertions on successful consumers. */
export interface ITestChildResult {
  readonly stdout: string
  readonly stderr: string
}

/** Let a barrier stop waiting as soon as any participating child fails. */
export function rejectOnTestChildFailure(children: readonly Promise<unknown>[]): Promise<never> {
  return new Promise((_, reject) => {
    for (const child of children) {
      void child.catch(reject)
    }
  })
}

/** Preserve the first failure while ensuring all consumers have exited. */
export async function runTestChildGroup<T>(children: readonly Promise<T>[]): Promise<T[]> {
  try {
    return await Promise.all(children)
  } catch (error) {
    await Promise.allSettled(children)
    throw error
  }
}

/** Run a named Node consumer, preserving its stderr and elapsed time on failure. */
export function runTestChild(
  name: string,
  args: readonly string[],
  options: {
    readonly env?: NodeJS.ProcessEnv
    readonly cwd?: string
    readonly timeoutMs?: number
  } = {}
): Promise<ITestChildResult> {
  const started = performance.now()
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [...args],
      {
        env: { ...childEnvironment(), ...options.env },
        cwd: options.cwd,
        timeout: options.timeoutMs ?? TEST_CHILD_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      },
      (error, stdout, stderr) => {
        if (error instanceof Error) {
          const elapsed = Math.round(performance.now() - started)
          const outcome = error.killed ? 'timed out' : 'failed'
          reject(new Error(`${name} ${outcome} after ${String(elapsed)} ms; stderr:\n${stderr}`))
        } else {
          resolve({ stdout, stderr })
        }
      }
    )
  })
}

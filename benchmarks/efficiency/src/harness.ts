/**
 * The orchestrator: runs each task through each pluggable {@link Runner},
 * captures metrics, and converts runner-thrown errors into recorded failures.
 *
 * The harness is intentionally ignorant of *how* a path executes. It only
 * orchestrates and scores, which is what makes the runners swappable — a real
 * discovery + code-mode macts runner drops in without touching this file.
 *
 * @packageDocumentation
 */

import { buildReport } from './report.js'
import type { BenchmarkReport, RunOutcome, Runner, TaskDefinition, TaskResult } from './types.js'

/** Default retry bound passed to runners for transient failures. */
export const DEFAULT_MAX_RETRIES = 2

/**
 * A monotonic clock, injected so wall-clock measurement is deterministic in
 * tests. Returns milliseconds.
 */
export type Clock = () => number

/** Options controlling a benchmark run. */
export interface RunOptions {
  /** Maximum retries the harness permits a runner per task. */
  readonly maxRetries?: number
  /** Clock used to measure wall-clock time. Defaults to `Date.now`. */
  readonly clock?: Clock
  /**
   * ISO-8601 timestamp stamped into the report. Defaults to
   * `new Date().toISOString()`. Injected for deterministic tests.
   */
  readonly generatedAt?: string
}

/** Reason recorded when a runner throws instead of resolving with a failure. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unknown runner error'
}

/**
 * Execute a single task with a single runner, capturing metrics.
 *
 * @remarks
 * Contract: a well-behaved runner *resolves* with `success: false` on task
 * failure. If a runner instead *throws* (an infrastructure fault — server down,
 * missing API key, unexpected exception), the harness catches it and records a
 * failure with `success: false`, `retries: maxRetries` (the bound was
 * exhausted), and the error message as `failureReason`. The run is never
 * allowed to crash the whole benchmark.
 */
export async function runTask(
  runner: Runner,
  task: TaskDefinition,
  maxRetries: number,
  clock: Clock
): Promise<TaskResult> {
  const start = clock()
  try {
    const outcome: RunOutcome = await runner.run({ task, maxRetries })
    const result: TaskResult = {
      taskId: task.id,
      runner: runner.kind,
      metrics: outcome.metrics,
    }
    if (!outcome.metrics.success) {
      return {
        ...result,
        failureReason: outcome.failureReason ?? 'Runner reported task failure',
      }
    }
    return result
  } catch (error) {
    const wallClockMs = Math.max(0, clock() - start)
    return {
      taskId: task.id,
      runner: runner.kind,
      metrics: {
        totalTokens: 0,
        turns: 0,
        wallClockMs,
        success: false,
        retries: maxRetries,
      },
      failureReason: describeError(error),
    }
  }
}

/**
 * Run every task against every runner and assemble the report.
 *
 * @param runners - the execution paths to benchmark (typically the raw and
 *   macts runners)
 * @param tasks - the task set
 * @param options - retry bound, clock, and report timestamp injection
 * @returns the complete {@link BenchmarkReport}
 */
export async function runBenchmark(
  runners: readonly Runner[],
  tasks: readonly TaskDefinition[],
  options: RunOptions = {}
): Promise<BenchmarkReport> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const clock = options.clock ?? Date.now
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  const results: TaskResult[] = []
  for (const task of tasks) {
    for (const runner of runners) {
      results.push(await runTask(runner, task, maxRetries, clock))
    }
  }

  return buildReport(results, generatedAt)
}

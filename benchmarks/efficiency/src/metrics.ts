/**
 * Pure aggregation of per-task results into per-path summaries and a
 * head-to-head comparison. No I/O, no clock — fully deterministic and
 * CI-testable.
 *
 * @packageDocumentation
 */

import type { Comparison, RunnerKind, RunnerSummary, TaskResult } from './types.js'

/**
 * Aggregate all results for a single path into a {@link RunnerSummary}.
 *
 * @param runner - the path to summarize
 * @param results - results across the whole run (filtered internally to `runner`)
 * @returns a summary; means are `0` when there are no results for the path
 */
export function summarizeRunner(runner: RunnerKind, results: readonly TaskResult[]): RunnerSummary {
  const own = results.filter((r) => r.runner === runner)
  const taskCount = own.length

  let successCount = 0
  let totalTokens = 0
  let totalTurns = 0
  let totalRetries = 0
  let totalWallClockMs = 0

  for (const { metrics } of own) {
    if (metrics.success) successCount++
    totalTokens += metrics.totalTokens
    totalTurns += metrics.turns
    totalRetries += metrics.retries
    totalWallClockMs += metrics.wallClockMs
  }

  return {
    runner,
    taskCount,
    successCount,
    successRate: taskCount === 0 ? 0 : successCount / taskCount,
    totalTokens,
    totalTurns,
    totalRetries,
    totalWallClockMs,
    meanTokensPerTask: taskCount === 0 ? 0 : totalTokens / taskCount,
    meanTurnsPerTask: taskCount === 0 ? 0 : totalTurns / taskCount,
  }
}

/**
 * Compute the head-to-head comparison between the raw-computer-use and macts
 * summaries.
 *
 * @remarks
 * Ratios are `raw / macts`, so `> 1` means macts is cheaper/fewer. A ratio is
 * `null` when the macts denominator is `0` (undefined ratio). The success-rate
 * delta is `macts − raw`.
 */
export function compareSummaries(raw: RunnerSummary, macts: RunnerSummary): Comparison {
  return {
    tokenRatio: macts.totalTokens === 0 ? null : raw.totalTokens / macts.totalTokens,
    turnRatio: macts.totalTurns === 0 ? null : raw.totalTurns / macts.totalTurns,
    successRateDelta: macts.successRate - raw.successRate,
  }
}

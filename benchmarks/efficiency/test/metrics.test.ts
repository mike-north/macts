/**
 * Tests for metrics aggregation.
 *
 * Expected aggregates are computed by hand from the input fixtures per the
 * definitions in `src/metrics.ts` (sums, success rate = successes/tasks, ratios
 * = raw/macts, delta = macts−raw). Not derived from program output.
 */

import { describe, expect, it } from 'vitest'
import { compareSummaries, summarizeRunner } from '../src/metrics.js'
import type { RunMetrics, TaskResult } from '../src/types.js'

function metrics(partial: Partial<RunMetrics>): RunMetrics {
  return {
    totalTokens: 0,
    turns: 0,
    wallClockMs: 0,
    success: true,
    retries: 0,
    ...partial,
  }
}

function result(taskId: string, runner: TaskResult['runner'], m: Partial<RunMetrics>): TaskResult {
  return { taskId, runner, metrics: metrics(m) }
}

describe('summarizeRunner', () => {
  it('sums tokens/turns/retries and computes means and success rate', () => {
    const results: TaskResult[] = [
      result('t1', 'macts', { totalTokens: 100, turns: 1, retries: 0, success: true }),
      result('t2', 'macts', { totalTokens: 300, turns: 1, retries: 1, success: false }),
      // a raw result that must be filtered out of the macts summary
      result('t1', 'raw-computer-use', { totalTokens: 9999, turns: 30 }),
    ]
    const summary = summarizeRunner('macts', results)

    expect(summary.taskCount).toBe(2)
    expect(summary.successCount).toBe(1)
    expect(summary.successRate).toBe(0.5) // 1 of 2
    expect(summary.totalTokens).toBe(400) // 100 + 300
    expect(summary.totalTurns).toBe(2) // 1 + 1
    expect(summary.totalRetries).toBe(1) // 0 + 1
    expect(summary.meanTokensPerTask).toBe(200) // 400 / 2
    expect(summary.meanTurnsPerTask).toBe(1) // 2 / 2
  })

  // Edge: no results for a path → zeros, no division by zero.
  it('returns zeros for a path with no results', () => {
    const summary = summarizeRunner('macts', [])
    expect(summary.taskCount).toBe(0)
    expect(summary.successRate).toBe(0)
    expect(summary.meanTokensPerTask).toBe(0)
    expect(summary.meanTurnsPerTask).toBe(0)
  })

  // A failed run still contributes the tokens/turns it consumed.
  it('counts tokens from failed runs', () => {
    const summary = summarizeRunner('raw-computer-use', [
      result('t1', 'raw-computer-use', { totalTokens: 500, turns: 12, success: false }),
    ])
    expect(summary.totalTokens).toBe(500)
    expect(summary.successCount).toBe(0)
  })
})

describe('compareSummaries', () => {
  it('computes ratios as raw/macts and delta as macts−raw', () => {
    const raw = summarizeRunner('raw-computer-use', [
      result('t1', 'raw-computer-use', { totalTokens: 1000, turns: 20, success: false }),
    ])
    const macts = summarizeRunner('macts', [
      result('t1', 'macts', { totalTokens: 200, turns: 1, success: true }),
    ])
    const comparison = compareSummaries(raw, macts)

    expect(comparison.tokenRatio).toBe(5) // 1000 / 200
    expect(comparison.turnRatio).toBe(20) // 20 / 1
    expect(comparison.successRateDelta).toBe(1) // 1.0 − 0.0
  })

  // Edge: zero macts denominator → null ratio (undefined), not Infinity.
  it('returns null ratios when the macts totals are zero', () => {
    const raw = summarizeRunner('raw-computer-use', [
      result('t1', 'raw-computer-use', { totalTokens: 100, turns: 5 }),
    ])
    const macts = summarizeRunner('macts', [result('t1', 'macts', { totalTokens: 0, turns: 0 })])
    const comparison = compareSummaries(raw, macts)
    expect(comparison.tokenRatio).toBeNull()
    expect(comparison.turnRatio).toBeNull()
  })
})

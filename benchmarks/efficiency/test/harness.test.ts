/**
 * Tests for the orchestrator.
 *
 * Expected behavior is derived from the harness contract in `src/harness.ts`:
 * a runner that resolves with `success:false` is recorded as a failure; a
 * runner that THROWS is caught and recorded as a failure with
 * `retries === maxRetries` and the error message as `failureReason`. A fixed
 * fake clock supplies deterministic wall-clock values.
 */

import { describe, expect, it } from 'vitest'
import { runBenchmark, runTask } from '../src/harness.js'
import { ScriptedRunner } from '../src/runners/scripted.js'
import type { ScriptedOutcome } from '../src/runners/scripted.js'
import type { RunMetrics, TaskDefinition } from '../src/types.js'

const GENERATED_AT = '2026-06-14T12:00:00.000Z'

function task(id: string): TaskDefinition {
  return {
    id,
    intent: `intent for ${id}`,
    apps: ['com.apple.iCal'],
    operationClass: 'write',
    mactsCapabilities: ['calendar.events.create'],
  }
}

function ok(partial: Partial<RunMetrics> = {}): ScriptedOutcome {
  return {
    kind: 'metrics',
    metrics: {
      totalTokens: 100,
      turns: 1,
      wallClockMs: 10,
      success: true,
      retries: 0,
      ...partial,
    },
  }
}

/** A clock that returns a fixed sequence of values, then holds the last. */
function fakeClock(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)] ?? 0
}

describe('runTask', () => {
  it('records a runner-reported failure with a reason', async () => {
    const runner = new ScriptedRunner(
      'macts',
      new Map([['t1', ok({ success: false, retries: 1 })]])
    )
    const out = await runTask(runner, task('t1'), 2, () => 0)
    expect(out.metrics.success).toBe(false)
    expect(out.failureReason).toBe('Runner reported task failure')
  })

  // Negative / core robustness: a thrown error becomes a recorded failure.
  it('catches a thrown runner error and records it as a failure with retries === maxRetries', async () => {
    const runner = new ScriptedRunner(
      'raw-computer-use',
      new Map([['t1', { kind: 'throw', error: new Error('server unreachable') }]])
    )
    const out = await runTask(runner, task('t1'), 3, fakeClock([1000, 1250]))

    expect(out.metrics.success).toBe(false)
    expect(out.metrics.retries).toBe(3) // bound exhausted
    expect(out.metrics.totalTokens).toBe(0)
    expect(out.metrics.turns).toBe(0)
    expect(out.metrics.wallClockMs).toBe(250) // 1250 − 1000
    expect(out.failureReason).toBe('server unreachable')
  })

  it('records a successful run unchanged', async () => {
    const runner = new ScriptedRunner('macts', new Map([['t1', ok({ totalTokens: 250 })]]))
    const out = await runTask(runner, task('t1'), 2, () => 0)
    expect(out.metrics.success).toBe(true)
    expect(out.metrics.totalTokens).toBe(250)
    expect(out.failureReason).toBeUndefined()
  })
})

describe('runBenchmark', () => {
  it('runs every task against every runner and builds a report', async () => {
    const tasks = [task('t1'), task('t2')]
    const raw = new ScriptedRunner(
      'raw-computer-use',
      new Map([
        ['t1', ok({ totalTokens: 2000, turns: 12, success: true })],
        ['t2', { kind: 'throw', error: new Error('lost the window') }],
      ])
    )
    const macts = new ScriptedRunner(
      'macts',
      new Map([
        ['t1', ok({ totalTokens: 200, turns: 1 })],
        ['t2', ok({ totalTokens: 300, turns: 1 })],
      ])
    )

    const report = await runBenchmark([raw, macts], tasks, {
      generatedAt: GENERATED_AT,
      clock: () => 0,
      maxRetries: 2,
    })

    // 2 tasks × 2 runners = 4 results.
    expect(report.results).toHaveLength(4)

    const rawSummary = report.summaries.find((s) => s.runner === 'raw-computer-use')
    const mactsSummary = report.summaries.find((s) => s.runner === 'macts')

    // raw: t1 success, t2 thrown→failure. 1 of 2 success.
    expect(rawSummary?.successRate).toBe(0.5)
    // macts: both succeed.
    expect(mactsSummary?.successRate).toBe(1)
    // macts token total = 200 + 300.
    expect(mactsSummary?.totalTokens).toBe(500)
    expect(report.generatedAt).toBe(GENERATED_AT)
  })
})

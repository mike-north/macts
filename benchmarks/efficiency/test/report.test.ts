/**
 * Tests for report generation (JSON shape + markdown content).
 *
 * Expected values are hand-derived from the contract in `src/types.ts`
 * (BenchmarkReport schema v1) and the aggregation rules in `src/metrics.ts`.
 * The timestamp is a fixed constant; no `new Date()` is used. Structural
 * assertions only — no snapshot/gold-master.
 */

import { describe, expect, it } from 'vitest'
import { buildReport, renderMarkdown } from '../src/report.js'
import type { TaskResult } from '../src/types.js'

const GENERATED_AT = '2026-06-14T12:00:00.000Z'

/** Two tasks, both paths: macts cheap+reliable, raw expensive+flaky. */
function sampleResults(): TaskResult[] {
  return [
    {
      taskId: 'create-calendar-event',
      runner: 'raw-computer-use',
      metrics: { totalTokens: 4000, turns: 18, wallClockMs: 9000, success: true, retries: 1 },
    },
    {
      taskId: 'create-calendar-event',
      runner: 'macts',
      metrics: { totalTokens: 400, turns: 1, wallClockMs: 800, success: true, retries: 0 },
    },
    {
      taskId: 'find-and-rename-file',
      runner: 'raw-computer-use',
      metrics: {
        totalTokens: 6000,
        turns: 22,
        wallClockMs: 12000,
        success: false,
        retries: 2,
      },
      failureReason: 'clicked the wrong file',
    },
    {
      taskId: 'find-and-rename-file',
      runner: 'macts',
      metrics: { totalTokens: 600, turns: 1, wallClockMs: 900, success: true, retries: 0 },
    },
  ]
}

describe('buildReport', () => {
  it('stamps schema version and the injected timestamp', () => {
    const report = buildReport(sampleResults(), GENERATED_AT)
    expect(report.schemaVersion).toBe(1)
    expect(report.generatedAt).toBe(GENERATED_AT)
  })

  it('summarizes raw: 2 tasks, 50% success, 10000 tokens, 40 turns, 3 retries', () => {
    const report = buildReport(sampleResults(), GENERATED_AT)
    const raw = report.summaries.find((s) => s.runner === 'raw-computer-use')
    expect(raw).toMatchObject({
      taskCount: 2,
      successCount: 1,
      successRate: 0.5,
      totalTokens: 10000, // 4000 + 6000
      totalTurns: 40, // 18 + 22
      totalRetries: 3, // 1 + 2
    })
  })

  it('summarizes macts: 2 tasks, 100% success, 1000 tokens, 2 turns, 0 retries', () => {
    const report = buildReport(sampleResults(), GENERATED_AT)
    const macts = report.summaries.find((s) => s.runner === 'macts')
    expect(macts).toMatchObject({
      taskCount: 2,
      successCount: 2,
      successRate: 1,
      totalTokens: 1000, // 400 + 600
      totalTurns: 2, // 1 + 1
      totalRetries: 0,
    })
  })

  it('computes the head-to-head comparison (raw/macts ratios, macts−raw delta)', () => {
    const report = buildReport(sampleResults(), GENERATED_AT)
    expect(report.comparison).toEqual({
      tokenRatio: 10, // 10000 / 1000
      turnRatio: 20, // 40 / 2
      successRateDelta: 0.5, // 1.0 − 0.5
    })
  })

  // Edge: when only one path produced results, comparison is null.
  it('sets comparison to null when a path has no results', () => {
    const onlyMacts: TaskResult[] = [
      {
        taskId: 'create-calendar-event',
        runner: 'macts',
        metrics: { totalTokens: 400, turns: 1, wallClockMs: 800, success: true, retries: 0 },
      },
    ]
    const report = buildReport(onlyMacts, GENERATED_AT)
    expect(report.comparison).toBeNull()
  })

  it('preserves failureReason on failed results', () => {
    const report = buildReport(sampleResults(), GENERATED_AT)
    const failed = report.results.find(
      (r) => r.taskId === 'find-and-rename-file' && r.runner === 'raw-computer-use'
    )
    expect(failed?.failureReason).toBe('clicked the wrong file')
  })
})

describe('renderMarkdown', () => {
  function md(): string {
    return renderMarkdown(buildReport(sampleResults(), GENERATED_AT))
  }

  it('includes the title and the injected timestamp', () => {
    const out = md()
    expect(out).toContain('# Efficiency benchmark report')
    expect(out).toContain(GENERATED_AT)
  })

  it('reports the headline token ratio of 10x (raw/macts)', () => {
    expect(md()).toContain('tokens: 10x (raw / macts)')
  })

  it('reports the headline round-trip ratio of 20x', () => {
    expect(md()).toContain('round-trips: 20x (raw / macts)')
  })

  it('reports the reliability delta of +50 points for macts', () => {
    expect(md()).toContain('reliability: macts +50 pts vs. raw')
  })

  it('renders summary rows with both paths and their success percentages', () => {
    const out = md()
    expect(out).toContain('| Raw computer-use | 2 | 50%')
    expect(out).toContain('| macts (structured) | 2 | 100%')
  })

  it('renders a per-task row carrying the failure reason', () => {
    expect(md()).toContain('clicked the wrong file')
  })

  // Edge: a null comparison renders an explanatory headline, not a crash.
  it('renders an explanatory headline when comparison is null', () => {
    const onlyMacts: TaskResult[] = [
      {
        taskId: 'create-calendar-event',
        runner: 'macts',
        metrics: { totalTokens: 400, turns: 1, wallClockMs: 800, success: true, retries: 0 },
      },
    ]
    const out = renderMarkdown(buildReport(onlyMacts, GENERATED_AT))
    expect(out).toContain('Both execution paths must produce results')
  })
})

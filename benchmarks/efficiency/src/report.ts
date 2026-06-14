/**
 * Report generation: builds the machine-readable {@link BenchmarkReport} and
 * renders a human-readable markdown summary from the *same* data, so the two
 * surfaces can never disagree.
 *
 * Both functions are pure. `buildReport` takes the timestamp as a parameter
 * rather than reading the clock, keeping it deterministic and testable.
 *
 * @packageDocumentation
 */

import { compareSummaries, summarizeRunner } from './metrics.js'
import type { BenchmarkReport, Comparison, RunnerSummary, TaskResult } from './types.js'

const md = String.raw

/**
 * Assemble a {@link BenchmarkReport} from raw per-task results.
 *
 * @param results - every (task, runner) result from the run
 * @param generatedAt - ISO-8601 timestamp to stamp into the report (injected
 *   for determinism; callers pass `new Date().toISOString()` in production)
 * @returns the schema-v1 report
 */
export function buildReport(results: readonly TaskResult[], generatedAt: string): BenchmarkReport {
  const raw = summarizeRunner('raw-computer-use', results)
  const macts = summarizeRunner('macts', results)
  const summaries: RunnerSummary[] = [raw, macts]

  // Comparison is only meaningful when both paths produced at least one result.
  const comparison: Comparison | null =
    raw.taskCount > 0 && macts.taskCount > 0 ? compareSummaries(raw, macts) : null

  return {
    schemaVersion: 1,
    generatedAt,
    results: [...results],
    summaries,
    comparison,
  }
}

/** Format a number to at most `digits` decimals, dropping trailing zeros. */
function fmt(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString()
}

/** Render a nullable ratio as `Nx` or `n/a`. */
function fmtRatio(ratio: number | null): string {
  return ratio === null ? 'n/a' : `${fmt(ratio)}x`
}

/** Render a success rate in [0,1] as a percentage string. */
function fmtPct(rate: number): string {
  return `${fmt(rate * 100, 1)}%`
}

/** Find a summary by path; throws if absent (report always contains both). */
function summaryFor(report: BenchmarkReport, runner: RunnerSummary['runner']): RunnerSummary {
  const found = report.summaries.find((s) => s.runner === runner)
  if (!found) throw new Error(`Report is missing summary for ${runner}`)
  return found
}

/**
 * Render the human-readable markdown summary from a {@link BenchmarkReport}.
 *
 * @remarks
 * Reads only from the report, never recomputing — guaranteeing the markdown and
 * JSON describe the same numbers.
 */
export function renderMarkdown(report: BenchmarkReport): string {
  const raw = summaryFor(report, 'raw-computer-use')
  const macts = summaryFor(report, 'macts')

  const headline = renderHeadline(report.comparison)

  const summaryTable = md`
| Path | Tasks | Success | Total tokens | Total turns | Total retries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Raw computer-use | ${String(raw.taskCount)} | ${fmtPct(raw.successRate)} | ${String(raw.totalTokens)} | ${String(raw.totalTurns)} | ${String(raw.totalRetries)} |
| macts (structured) | ${String(macts.taskCount)} | ${fmtPct(macts.successRate)} | ${String(macts.totalTokens)} | ${String(macts.totalTurns)} | ${String(macts.totalRetries)} |
`.trim()

  const perTaskTable = renderPerTaskTable(report.results)

  return md`
# Efficiency benchmark report

_Generated: ${report.generatedAt} (schema v${String(report.schemaVersion)})_

## Headline

${headline}

## Summary

${summaryTable}

## Per-task results

${perTaskTable}
`.trimStart()
}

/** Render the one-paragraph headline from the comparison block. */
function renderHeadline(comparison: Comparison | null): string {
  if (comparison === null) {
    return 'Both execution paths must produce results before a comparison can be drawn.'
  }
  const tokenPart = `tokens: ${fmtRatio(comparison.tokenRatio)} (raw / macts)`
  const turnPart = `round-trips: ${fmtRatio(comparison.turnRatio)} (raw / macts)`
  const reliabilityPart = `reliability: macts ${comparison.successRateDelta >= 0 ? '+' : ''}${fmt(
    comparison.successRateDelta * 100,
    1
  )} pts vs. raw`
  return `${tokenPart}; ${turnPart}; ${reliabilityPart}. A ratio above 1x means the structured macts path is cheaper.`
}

/** Render one markdown row per (task, runner) result. */
function renderPerTaskTable(results: readonly TaskResult[]): string {
  const header = md`
| Task | Path | Success | Tokens | Turns | Retries | Wall-clock (ms) | Failure |
| ---- | ---- | :-----: | -----: | ----: | ------: | --------------: | ------- |
  `.trim()

  const rows = results.map((r) => {
    const m = r.metrics
    const success = m.success ? 'yes' : 'no'
    const failure = r.failureReason ?? ''
    return `| ${r.taskId} | ${r.runner} | ${success} | ${String(m.totalTokens)} | ${String(
      m.turns
    )} | ${String(m.retries)} | ${String(m.wallClockMs)} | ${failure} |`
  })

  return [header, ...rows].join('\n')
}

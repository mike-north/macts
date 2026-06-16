/**
 * Efficiency benchmark harness: structured macts automation vs. raw computer-use.
 *
 * The harness measures the thesis that the structured, permissioned path is
 * cheaper and more reliable than driving the UI by pixels (VISION.md §4.4).
 *
 * Public surface:
 * - Types and the {@link Runner} contract ({@link ./types.js}).
 * - The default task set and its validation ({@link ./tasks/registry.js}).
 * - The orchestrator ({@link ./harness.js}).
 * - Pure metrics and report generation ({@link ./metrics.js}, {@link ./report.js}).
 * - The two real runners plus a deterministic scripted runner for tests.
 *
 * @packageDocumentation
 */

export type {
  BenchmarkReport,
  Comparison,
  OperationClass,
  RunContext,
  RunMetrics,
  Runner,
  RunnerKind,
  RunnerSummary,
  TaskDefinition,
  TaskResult,
} from './types.js'

export { parseTaskDefinition, parseTaskSet, taskDefinitionSchema } from './tasks/schema.js'
export { DEFAULT_TASKS } from './tasks/registry.js'

export { compareSummaries, summarizeRunner } from './metrics.js'
export { buildReport, renderMarkdown } from './report.js'

export { DEFAULT_MAX_RETRIES, runBenchmark, runTask } from './harness.js'
export type { Clock, RunOptions } from './harness.js'

export { ScriptedRunner } from './runners/scripted.js'
export type { ScriptedOutcome } from './runners/scripted.js'

export { RawComputerUseRunner, DEFAULT_RAW_MAX_TURNS } from './runners/raw-computer-use.js'
export type { RawComputerUseDeps, ScreenController } from './runners/raw-computer-use.js'

export { MactsRunner } from './runners/macts.js'
export type { ComposedScript, ComposedScriptResult, MactsRunnerDeps } from './runners/macts.js'

export { UsageMeter } from './runners/agent.js'
export type { ModelDriver, TurnUsage } from './runners/agent.js'

export { ENV, LiveEnvironmentError, resolveLiveConfig } from './runners/environment.js'
export type { LiveConfig } from './runners/environment.js'

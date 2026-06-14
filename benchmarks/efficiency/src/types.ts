/**
 * Core types for the efficiency benchmark harness.
 *
 * The harness compares two execution paths for the same desktop task:
 *
 * - `raw-computer-use` — an agent driving the UI by pixels (screenshot/click/type loop).
 * - `macts` — structured automation through typed, permissioned capabilities.
 *
 * The thesis under test (VISION.md §4.4 / STRATEGY.md North Star) is that the
 * structured path must be measurably cheaper and more reliable. This module
 * defines the data contract: tasks, runners, captured metrics, and the report.
 *
 * @packageDocumentation
 */

/**
 * The two execution paths the benchmark compares.
 *
 * @remarks
 * Kept as a string-literal union (not an enum) so it serializes cleanly into
 * the machine-readable report and is stable across the SDK boundary.
 */
export type RunnerKind = 'raw-computer-use' | 'macts'

/**
 * Risk classification for a task's primary operation, mirroring the macts
 * `read/write/delete/send/execute/system-change` model (VISION.md §7.1).
 *
 * @remarks
 * Captured so reports can weight reliability/cost by operation sensitivity and
 * so governability findings can reference the operation class.
 */
export type OperationClass = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * A single representative desktop task, defined as data so engineers can add
 * tasks without touching harness code.
 *
 * @remarks
 * A task is path-agnostic: the same definition drives both the raw-computer-use
 * and macts runners. `mactsCapabilities` and `apps` document what each path
 * needs at runtime; they do not change harness behavior.
 */
export interface TaskDefinition {
  /** Stable, unique identifier (kebab-case), e.g. `create-calendar-event`. */
  readonly id: string
  /** One-line human description of the user intent. */
  readonly intent: string
  /**
   * macOS application bundle identifiers the task touches, e.g.
   * `com.apple.iCal`. Used to document the live-environment requirement.
   */
  readonly apps: readonly string[]
  /**
   * The risk class of the task's primary mutating operation. `read` for
   * read-only tasks.
   */
  readonly operationClass: OperationClass
  /**
   * macts capability names the structured path is expected to compose, e.g.
   * `calendar.events.create`. Documents the discovery/code-mode surface a
   * future real macts runner will resolve; the SDK-backed runner selects these
   * explicitly today.
   */
  readonly mactsCapabilities: readonly string[]
  /**
   * Free-form notes — preconditions, expected end state, cleanup guidance.
   */
  readonly notes?: string
}

/**
 * Metrics captured for one (task, runner) execution.
 *
 * @remarks
 * All counters are non-negative integers except `wallClockMs`, which is a
 * non-negative number of milliseconds. A runner that fails still reports the
 * tokens/turns it consumed before failing.
 */
export interface RunMetrics {
  /** Total model input + output tokens consumed across all turns. */
  readonly totalTokens: number
  /** Number of model round-trips (turns) the path required. */
  readonly turns: number
  /** Wall-clock duration of the run in milliseconds. */
  readonly wallClockMs: number
  /** Whether the task reached its expected end state. */
  readonly success: boolean
  /**
   * Number of retries the runner performed (a fresh successful run is `0`).
   * A run that ultimately failed reports the retries it attempted.
   */
  readonly retries: number
}

/**
 * The outcome of running one task via one path, including an optional failure
 * reason for diagnostics.
 */
export interface TaskResult {
  readonly taskId: string
  readonly runner: RunnerKind
  readonly metrics: RunMetrics
  /** Present only when `metrics.success` is `false`. */
  readonly failureReason?: string
}

/**
 * Context passed to a runner for a single task execution.
 *
 * @remarks
 * Carries only what a runner needs and nothing about scoring, so runners stay
 * swappable. A future real-macts runner (discovery + code-mode) implements the
 * same {@link Runner} interface against this context.
 */
export interface RunContext {
  readonly task: TaskDefinition
  /**
   * Maximum retries the harness permits for a transient failure. Runners may
   * retry internally up to this bound and report the count in {@link RunMetrics}.
   */
  readonly maxRetries: number
}

/**
 * A pluggable execution path. Implementations measure their own token/turn cost
 * and report it; the harness only orchestrates and scores.
 *
 * @remarks
 * This is the seam that keeps the spike honest: `RawComputerUseRunner` and
 * `MactsRunner` implement it today, and a real discovery + code-mode runner can
 * replace `MactsRunner` later without any change to the harness, metrics, or
 * report code.
 */
export interface Runner {
  /** Which path this runner represents — labels the captured metrics. */
  readonly kind: RunnerKind
  /**
   * Execute the task and return measured metrics. Implementations should
   * resolve (not reject) on task failure, recording `success: false` and a
   * `failureReason`; a thrown error is treated by the harness as an
   * infrastructure failure (see {@link runTask}).
   */
  run(context: RunContext): Promise<RunMetrics>
}

/**
 * Per-path aggregate across the whole task set.
 */
export interface RunnerSummary {
  readonly runner: RunnerKind
  readonly taskCount: number
  readonly successCount: number
  /** Success rate in [0, 1]. */
  readonly successRate: number
  readonly totalTokens: number
  readonly totalTurns: number
  readonly totalRetries: number
  readonly totalWallClockMs: number
  /** Mean tokens per task across all tasks (including failed ones). */
  readonly meanTokensPerTask: number
  /** Mean turns per task across all tasks (including failed ones). */
  readonly meanTurnsPerTask: number
}

/**
 * Head-to-head comparison between the two paths, derived from their summaries.
 *
 * @remarks
 * Ratios are `raw-computer-use / macts`, so a value `> 1` means macts is
 * cheaper/fewer. `null` is used where a ratio is undefined (division by zero).
 */
export interface Comparison {
  /** Tokens: raw / macts. `> 1` means macts uses fewer tokens. */
  readonly tokenRatio: number | null
  /** Turns: raw / macts. `> 1` means macts uses fewer round-trips. */
  readonly turnRatio: number | null
  /** Success-rate delta: macts − raw, in [-1, 1]. `> 0` means macts is more reliable. */
  readonly successRateDelta: number
}

/**
 * The complete machine-readable benchmark report.
 *
 * @remarks
 * This is the documented JSON schema (v1). `schemaVersion` lets downstream
 * tooling and future runs detect shape changes. `generatedAt` is ISO-8601.
 */
export interface BenchmarkReport {
  readonly schemaVersion: 1
  /** ISO-8601 timestamp of when the report was generated. */
  readonly generatedAt: string
  /** Per-task, per-path raw results. */
  readonly results: readonly TaskResult[]
  /** Per-path aggregates. */
  readonly summaries: readonly RunnerSummary[]
  /** Head-to-head comparison. `null` when one of the paths produced no results. */
  readonly comparison: Comparison | null
}

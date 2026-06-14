/**
 * The macts path: structured automation through typed, permissioned capabilities.
 *
 * Per the spike interpretation, the two downstream runtimes are stood in for:
 *
 * - **Discovery** → explicit, declared capability selection. Each task names the
 *   `@macts/*` capabilities it composes (see `TaskDefinition.mactsCapabilities`),
 *   and an authored `ComposedScript` selects the matching typed SDK calls. A
 *   future real-discovery runner resolves these from the capability registry.
 * - **Code-mode** → a single hand-authored composed script that performs N typed
 *   operations in **one** model round-trip. This is the structural advantage the
 *   benchmark measures: the agent emits one execution instead of looping. A
 *   future real code-mode runtime sandbox-executes agent-authored TS in its place.
 *
 * Crucially, this runner implements the same {@link Runner} interface as every
 * other path, so swapping in real discovery + code-mode later requires no change
 * to the harness, metrics, or report.
 *
 * @remarks
 * Executing this path requires the live macts API server, a macts API key
 * scoped to the task's capabilities, and the target apps. It CANNOT run in CI.
 * Without those dependencies it throws {@link LiveEnvironmentError}, which the
 * harness records as a task failure. The single-turn composition logic is
 * unit-testable with injected fakes.
 *
 * @packageDocumentation
 */

import { LiveEnvironmentError } from './environment.js'
import { UsageMeter } from './agent.js'
import type { TurnUsage } from './agent.js'
import type { LiveConfig } from './environment.js'
import type { RunContext, RunMetrics, Runner, TaskDefinition } from '../types.js'

/**
 * The result of executing a task's composed capability script against the live
 * macts server.
 */
export interface ComposedScriptResult {
  /** Whether the composed operations reached the task's expected end state. */
  readonly success: boolean
  /** Optional diagnostic if `success` is `false`. */
  readonly reason?: string
}

/**
 * A hand-authored composed automation for one task — the code-mode stand-in.
 *
 * It receives the live macts config (to construct typed SDK clients) and the
 * task, performs all needed typed operations, and reports the end state. It must
 * NOT call any model; the model cost of the macts path is the single planning
 * turn that emits this script (see {@link MactsRunnerDeps.planningUsage}).
 */
export type ComposedScript = (
  config: LiveConfig,
  task: TaskDefinition
) => Promise<ComposedScriptResult>

/** Dependencies for a live macts run. */
export interface MactsRunnerDeps {
  readonly config: LiveConfig
  /**
   * Authored composed scripts keyed by task id. Each is the code-mode stand-in
   * for that task. A task without a script is a configuration error and fails.
   */
  readonly scripts: ReadonlyMap<string, ComposedScript>
  /**
   * Token usage attributed to the single planning turn that emits the composed
   * script. Measured from a real model call in a live run; injected here so the
   * accounting is explicit and testable.
   */
  readonly planningUsage: TurnUsage
}

/**
 * Runner for the macts structured path.
 *
 * @remarks
 * Construct with `deps` to execute live, or without to obtain a runner that
 * fails fast with a {@link LiveEnvironmentError}.
 */
export class MactsRunner implements Runner {
  readonly kind = 'macts' as const
  readonly #deps: MactsRunnerDeps | undefined

  constructor(deps?: MactsRunnerDeps) {
    this.#deps = deps
  }

  async run(context: RunContext): Promise<RunMetrics> {
    const deps = this.#deps
    if (!deps) {
      throw new LiveEnvironmentError(
        `MactsRunner requires the live macts API server and a scoped API key to run "${context.task.id}". ` +
          'See benchmarks/efficiency/README.md for the live-run procedure.'
      )
    }
    return this.#compose(deps, context)
  }

  /**
   * The single-turn composition: one planning turn, then one composed execution
   * of N typed operations. Factored out so it is independently testable.
   */
  async #compose(deps: MactsRunnerDeps, context: RunContext): Promise<RunMetrics> {
    const start = Date.now()
    const meter = new UsageMeter()

    // Code-mode collapses N operations into ONE model round-trip: the agent
    // plans once and emits a composed script. That single turn is the only
    // model cost on this path.
    meter.record(deps.planningUsage)

    const script = deps.scripts.get(context.task.id)
    if (!script) {
      return {
        totalTokens: meter.totalTokens,
        turns: meter.turns,
        wallClockMs: Math.max(0, Date.now() - start),
        success: false,
        retries: 0,
      }
    }

    let retries = 0
    let success = false
    for (;;) {
      const result = await script(deps.config, context.task)
      if (result.success) {
        success = true
        break
      }
      if (retries >= context.maxRetries) break
      retries += 1
    }

    return {
      totalTokens: meter.totalTokens,
      turns: meter.turns,
      wallClockMs: Math.max(0, Date.now() - start),
      success,
      retries,
    }
  }
}

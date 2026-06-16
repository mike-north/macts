/**
 * The raw computer-use path: an agent driving the UI by pixels.
 *
 * One model turn = one (screenshot → reason → action) cycle. The runner loops
 * until the model signals completion or the turn budget is exhausted, metering
 * tokens and turns throughout.
 *
 * @remarks
 * Executing this path requires a live Mac with the target apps, a screen
 * controller (screenshot + click/type), and a computer-use model. It CANNOT run
 * in CI. When invoked without those dependencies it throws
 * {@link LiveEnvironmentError}, which the harness records as a task failure.
 * The loop logic itself is unit-testable by injecting fakes.
 *
 * @packageDocumentation
 */

import { LiveEnvironmentError } from './environment.js'
import { UsageMeter } from './agent.js'
import type { ModelDriver } from './agent.js'
import type { RunContext, RunOutcome, Runner } from '../types.js'

/**
 * Captures the screen and performs pixel-level input. The real implementation
 * shells out to `screencapture` and a synthetic-input tool; tests inject a fake.
 */
export interface ScreenController {
  /** Capture the current screen, returning an observation the model can read. */
  screenshot(): Promise<string>
  /** Perform a pixel-level action described by the model (e.g. click/type). */
  perform(action: string): Promise<void>
}

/** Dependencies for a live raw-computer-use run. */
export interface RawComputerUseDeps {
  readonly driver: ModelDriver
  readonly screen: ScreenController
  /** Hard cap on model turns to bound a runaway pixel-driving loop. */
  readonly maxTurns: number
}

/** Default turn cap for the raw path; pixel-driving is turn-hungry. */
export const DEFAULT_RAW_MAX_TURNS = 40

/**
 * Runner for the raw computer-use path.
 *
 * @remarks
 * Construct with `deps` to execute against a live environment, or without to
 * obtain a runner that fails fast with a {@link LiveEnvironmentError} (used so a
 * benchmark invocation in a non-live environment yields a clean recorded
 * failure rather than a crash).
 */
export class RawComputerUseRunner implements Runner {
  readonly kind = 'raw-computer-use' as const
  readonly #deps: RawComputerUseDeps | undefined

  constructor(deps?: RawComputerUseDeps) {
    this.#deps = deps
  }

  async run(context: RunContext): Promise<RunOutcome> {
    const deps = this.#deps
    if (!deps) {
      throw new LiveEnvironmentError(
        `RawComputerUseRunner requires a live screen controller and model to run "${context.task.id}". ` +
          'See benchmarks/efficiency/README.md for the live-run procedure.'
      )
    }
    return this.#drive(deps, context)
  }

  /** The screenshot → act loop, factored out so it is independently testable. */
  async #drive(deps: RawComputerUseDeps, context: RunContext): Promise<RunOutcome> {
    const start = Date.now()
    const meter = new UsageMeter()
    let retries = 0
    let success = false

    let observation = await deps.screen.screenshot()
    for (let turn = 0; turn < deps.maxTurns; turn++) {
      const { usage, done, action } = await deps.driver.step(observation)
      meter.record(usage)
      if (done) {
        success = true
        break
      }
      if (action) {
        try {
          await deps.screen.perform(action)
        } catch {
          // A failed pixel action is a transient fault on this path; retry up
          // to the harness bound, then give up.
          if (retries >= context.maxRetries) break
          retries += 1
        }
      }
      observation = await deps.screen.screenshot()
    }

    return {
      metrics: {
        totalTokens: meter.totalTokens,
        turns: meter.turns,
        wallClockMs: Math.max(0, Date.now() - start),
        success,
        retries,
      },
    }
  }
}

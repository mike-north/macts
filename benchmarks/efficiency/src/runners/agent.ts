/**
 * The model-driver seam.
 *
 * Both real runners drive a model and must account for the tokens and turns it
 * consumes. They depend on this small interface rather than a concrete SDK so
 * the runner logic is unit-testable with a fake driver, and so a real
 * computer-use model client can be injected at the edge.
 *
 * @packageDocumentation
 */

/** A single turn's token usage, as reported by the model. */
export interface TurnUsage {
  readonly inputTokens: number
  readonly outputTokens: number
}

/**
 * Accumulates token and turn counts across a task execution.
 *
 * @remarks
 * A small mutable accumulator owned by a runner for the duration of one task.
 * Runners read its totals into the final {@link import('../types.js').RunMetrics}.
 */
export class UsageMeter {
  #turns = 0
  #inputTokens = 0
  #outputTokens = 0

  /** Record one model round-trip and its token usage. */
  record(usage: TurnUsage): void {
    this.#turns += 1
    this.#inputTokens += usage.inputTokens
    this.#outputTokens += usage.outputTokens
  }

  /** Number of model round-trips recorded. */
  get turns(): number {
    return this.#turns
  }

  /** Total input + output tokens recorded. */
  get totalTokens(): number {
    return this.#inputTokens + this.#outputTokens
  }
}

/**
 * Minimal driver over a computer-use / tool-using model. One `step` is one
 * model round-trip. Implementations report token usage per step.
 *
 * @remarks
 * The raw runner's steps return screenshots and emit click/type actions; the
 * macts runner's steps emit typed capability calls. The benchmark only needs
 * the usage accounting and a terminal signal, so the interface stays tiny.
 */
export interface ModelDriver {
  /**
   * Advance the agent by one turn given the latest observation. Returns the
   * turn's usage and whether the agent considers the task complete.
   */
  step(observation: string): Promise<{
    readonly usage: TurnUsage
    readonly done: boolean
    /** Optional next observation request (e.g. a tool/action to perform). */
    readonly action?: string
  }>
}

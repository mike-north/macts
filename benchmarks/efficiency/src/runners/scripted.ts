/**
 * A deterministic, dependency-free {@link Runner} used to exercise the harness,
 * metrics, and report code in CI.
 *
 * @remarks
 * This is NOT a measurement of either real path. It replays pre-supplied
 * metrics (or throws a pre-supplied error) so the orchestration logic can be
 * tested without a live Mac, API server, or model. Spec-first tests assert the
 * harness's transformation of these known inputs.
 *
 * @packageDocumentation
 */

import type { RunContext, RunMetrics, RunOutcome, Runner, RunnerKind } from '../types.js'

/** A scripted outcome for one task id: either metrics to return or an error to throw. */
export type ScriptedOutcome =
  | {
      readonly kind: 'metrics'
      readonly metrics: RunMetrics
      /** Optional failure reason to include in the returned {@link RunOutcome}. */
      readonly failureReason?: string
    }
  | { readonly kind: 'throw'; readonly error: Error }

/**
 * A runner that returns canned outcomes keyed by task id. Used only in tests.
 */
export class ScriptedRunner implements Runner {
  readonly kind: RunnerKind
  readonly #outcomes: ReadonlyMap<string, ScriptedOutcome>

  constructor(kind: RunnerKind, outcomes: ReadonlyMap<string, ScriptedOutcome>) {
    this.kind = kind
    this.#outcomes = outcomes
  }

  run(context: RunContext): Promise<RunOutcome> {
    const outcome = this.#outcomes.get(context.task.id)
    if (!outcome) {
      return Promise.reject(
        new Error(`ScriptedRunner has no outcome for task "${context.task.id}"`)
      )
    }
    if (outcome.kind === 'throw') {
      return Promise.reject(outcome.error)
    }
    const runOutcome: RunOutcome =
      outcome.failureReason !== undefined
        ? { metrics: outcome.metrics, failureReason: outcome.failureReason }
        : { metrics: outcome.metrics }
    return Promise.resolve(runOutcome)
  }
}

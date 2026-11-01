/**
 * The executor seam: the provider-supplied mechanism that carries out a
 * manifest-defined operation against a target app.
 *
 * Everything above this seam is provider-neutral: the shared runtime verifies
 * authority, enforces permissions and governance policy, and validates input
 * before it calls an executor. An executor only executes. The native macOS
 * automation path is one implementation; other providers implement the same
 * interface, and the runtime is constructed with whichever executor applies.
 *
 * @packageDocumentation
 */

import type { OperationTarget, ValuePlan, WireRecord, WireValue } from '@macts/contracts'
import type { AppManifest } from '../manifest/schemas/app.js'

/**
 * One operation, already authorized and validated, handed to an executor.
 *
 * @remarks
 * Carries no credential or authority: authorization has already happened, and
 * an executor needs neither to do its work.
 */
export interface ExecutionRequest {
  /** The validated manifest of the target app. */
  readonly manifest: AppManifest
  /** The manifest command (and resource) to execute. */
  readonly target: OperationTarget
  /**
   * Input record in wire form, already validated against its wire schema. Under
   * a passthrough input plan it is the plain JSON record instead.
   */
  readonly input: WireRecord
  /**
   * Shape of `input`. Always present: an operation whose value types do not
   * yet carry plans uses `PASSTHROUGH_PLAN` explicitly.
   */
  readonly inputPlan: ValuePlan
  /** Shape the result must take; `PASSTHROUGH_PLAN` under the same condition. */
  readonly outputPlan: ValuePlan
  /** Abort the execution. */
  readonly signal?: AbortSignal
}

/**
 * Carries out operations for one provider.
 *
 * @remarks
 * `execute` resolves to the result in wire form. On failure it throws one of
 * the canonical structured errors from `@macts/contracts`: the executor is the
 * only component that understands its provider's native failures, so it is
 * responsible for classifying them (missing target, missing file, app
 * unavailable, and so on). Anything else it throws is treated by the runtime as
 * an internal error.
 */
export interface Executor {
  /** Identifies the provider, for diagnostics. */
  readonly provider: string
  /** Execute one operation and return its result in wire form. */
  execute(request: ExecutionRequest): Promise<WireValue>
}

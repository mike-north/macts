/**
 * The executor seam: the provider-supplied mechanism that carries out a
 * manifest-defined operation against a target app, and resolves references to
 * the app's objects.
 *
 * Everything above this seam is provider-neutral: the shared runtime verifies
 * authority, enforces permissions and governance policy, and validates input
 * before it calls an executor. An executor only executes. The native macOS
 * automation path is one implementation; other providers implement the same
 * interface, and the runtime is constructed with whichever executor applies.
 *
 * @packageDocumentation
 */

import type {
  OperationTarget,
  ReferenceWire,
  ValuePlan,
  WireRecord,
  WireValue,
} from '@macts/contracts'
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
 * One reference, already authorized and validated, handed to an executor to
 * resolve into the record or records it denotes.
 *
 * @remarks
 * The runtime has already run the reference through the full invocation
 * pipeline as a call of the target resource's `get` operation (a single
 * reference) or `list` operation (a collection reference): permission,
 * governance, and approval. Like {@link ExecutionRequest}, it carries no
 * credential or authority.
 */
export interface ResolutionRequest {
  /** The validated manifest of the target app. */
  readonly manifest: AppManifest
  /**
   * The reference in wire form, already validated by `t.reference` over the
   * app contract's resources.
   */
  readonly reference: ReferenceWire
  /**
   * The shape of the result: the resource's get operation output plan for
   * cardinality `'one'`, its list operation output plan for `'many'`.
   */
  readonly outputPlan: ValuePlan
  /** Abort the resolution. */
  readonly signal?: AbortSignal
}

/**
 * Carries out operations, and resolves references, for one provider.
 *
 * @remarks
 * `execute` and `resolve` resolve to their result in wire form. On failure
 * they throw one of the canonical structured errors from `@macts/contracts`:
 * the executor is the only component that understands its provider's native
 * failures, so it is responsible for classifying them (missing target, missing
 * file, app unavailable, and so on). Anything else it throws is treated by the
 * runtime as an internal error.
 */
export interface Executor {
  /** Identifies the provider, for diagnostics. */
  readonly provider: string
  /** Execute one operation and return its result in wire form. */
  execute(request: ExecutionRequest): Promise<WireValue>
  /**
   * Resolve one reference into the record or records it denotes, in wire form
   * shaped by `request.outputPlan`.
   *
   * @remarks
   * A single reference (cardinality `'one'`) resolves to the record. An
   * identity reference whose id matches nothing, or a name selector with no
   * match, fails with `TargetNotFoundError`. An index selector past the end of
   * its container fails with `InvalidSelectionError`.
   *
   * A collection reference (cardinality `'many'`) resolves to an array of
   * records, possibly empty. A range selector that extends past the end of its
   * container fails with `InvalidSelectionError`; failure is never turned into
   * an empty result. An identity collection resolves its entries in order;
   * when an entry's target no longer exists it fails with
   * `TargetNotFoundError` whose `entryIndex` names that entry's zero-based
   * position, and the entry is never silently dropped. An identity collection
   * with no entries resolves to `[]`.
   *
   * Container chains are evaluated natively, to locate the target, and
   * contribute no data to the result.
   *
   * Like `execute`, it receives no credential or authority: authorization has
   * already happened.
   */
  resolve(request: ResolutionRequest): Promise<WireValue>
}

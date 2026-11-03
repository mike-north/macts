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
  ResourcePlanTable,
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
  /**
   * Shape the result must take; `PASSTHROUGH_PLAN` under the same condition.
   *
   * @remarks
   * For a list operation, whose output is a page, this is the plan of the
   * page's items as an array: the executor reads items, and the runtime
   * assembles the page and its cursor around them.
   */
  readonly outputPlan: ValuePlan
  /**
   * The value plans of the app's resources, from its registered contract:
   * what converting a reference in `input` or in the result needs. Always
   * present: an app registered without a contract passes
   * `EMPTY_RESOURCE_PLAN_TABLE`, and then no reference converts.
   */
  readonly resourcePlans: ResourcePlanTable
  /**
   * The window of a list to read, present exactly when the operation pages
   * (a list of a resource that has an identifier). Absent for every other
   * operation, including a list that does not page, which reads its whole
   * collection.
   *
   * @remarks
   * When it is present, `execute` resolves to a {@link PageWindowResult}
   * instead of the array `outputPlan` describes. `input` then holds only the
   * operation's other inputs: the runtime has already consumed the paging
   * inputs and turned them into this window.
   */
  readonly page?: PageWindow
  /** Abort the execution. */
  readonly signal?: AbortSignal
}

/**
 * The identifier of a listed item as the app reports it, used to anchor a
 * page: a string, or a number for an app whose identifiers are numbers.
 */
export type PageAnchor = string | number

/**
 * Which items of a collection one page reads, in the collection's order.
 *
 * @remarks
 * Positions are zero-based and the window is half-open: the page holds the
 * items at `offset` up to, but not including, `offset + size`, and fewer when
 * the collection ends first.
 *
 * `anchor` makes continuation exact: it is the identifier of the last item the
 * previous page returned, which sat at position `offset - 1`. The executor
 * checks, in the same native request as the page read, that the item at
 * `offset - 1` still has that identifier, and fails with
 * `CollectionChangedError` when it does not, or when the collection no longer
 * reaches that position. Items inserted or removed after the anchor are
 * therefore harmless, and any move of the anchor is detected; a pair of
 * compensating moves across the anchor goes undetected.
 */
export interface PageWindow {
  /** Position of the first item to read; a non-negative integer. */
  readonly offset: number
  /** The most items to read; a positive integer. */
  readonly size: number
  /** Identifier the item at `offset - 1` must still have; present exactly when `offset > 0`. */
  readonly anchor?: PageAnchor
}

/**
 * What `execute` resolves to for a request with a {@link PageWindow}, as a
 * wire record.
 *
 * @remarks
 * The runtime turns it into the operation's page: whether more items remain
 * is `offset + size < length`, and the next page is anchored on `last`.
 */
export interface PageWindowResult {
  /** The items in the window, in collection order, each shaped by the item plan. */
  readonly items: readonly WireValue[]
  /** The collection's length when the window was read. */
  readonly length: number
  /** The identifier of the last item in `items`; present exactly when `items` is not empty. */
  readonly last?: PageAnchor
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
   * cardinality `'one'`; for `'many'`, an array of its list operation's item
   * plan. Resolution is never paged: a collection resolves to its whole
   * selection.
   */
  readonly outputPlan: ValuePlan
  /**
   * The value plans of the app's resources, from its registered contract, as
   * on {@link ExecutionRequest.resourcePlans}: what converting the reference, its
   * containers, and any reference in the result needs. Always present.
   */
  readonly resourcePlans: ResourcePlanTable
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
  /**
   * Execute one operation and return its result in wire form: the value
   * `request.outputPlan` describes, or a {@link PageWindowResult} when
   * `request.page` is present.
   */
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

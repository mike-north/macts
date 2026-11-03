/**
 * Bounded list pages: the result shape every list operation shares, the
 * paging inputs it takes, and the bounds on a page's size.
 *
 * A list operation never returns a whole collection in one call. It returns
 * one {@link Page} of at most a page size of items, and says whether more
 * remain by carrying a `nextCursor`. The caller continues by sending the same
 * inputs again plus that cursor. Paging bounds the size and the latency of
 * each call; it does not make a full listing cheaper in total.
 *
 * The page shape and the paging inputs are protocol, not app data, so they are
 * strict: `nextCursor` is absent when the listing is complete and is never
 * `null`, and a page size outside {@link PAGE_SIZE_LIMITS} is a validation
 * failure, never clamped.
 *
 * The constructors live with the other value types (`t.page`,
 * `t.pageInputs`); this module declares the shapes and the bounds they share.
 *
 * @packageDocumentation
 */

import type { Integer } from './integer.js'
import type { OptionalField } from './value-types.js'
import type { ValueType } from './value-type.js'

/**
 * One page of a list operation's result.
 *
 * @typeParam T - The listed item.
 */
export interface Page<T> {
  /** The items of this page, in collection order. At most the requested page size. */
  readonly items: readonly T[]
  /**
   * Present exactly when more items remain after this page: send the same
   * inputs again with this value as `cursor` to read the next page. Absent
   * means the listing is complete. Opaque: its content is not part of the
   * contract.
   */
  readonly nextCursor?: string
}

/**
 * The paging inputs of a list operation, as SDK callers pass them.
 *
 * @remarks
 * Both are optional. Without `cursor` the first page is read; without
 * `pageSize` the page holds at most {@link PAGE_SIZE_LIMITS}.default items.
 */
export interface PageRequest {
  /**
   * The most items the page may hold: an integer from 1 to
   * {@link PAGE_SIZE_LIMITS}.maximum. Anything else is rejected, never clamped.
   */
  readonly pageSize?: Integer
  /**
   * The `nextCursor` of the previous page, sent with the same other inputs as
   * the call that returned it.
   */
  readonly cursor?: string
}

/**
 * The bounds on a page's size, the same on every surface.
 *
 * @remarks
 * Chosen from measurement on the slowest supported list (phases/13 D10): a
 * page of `maximum` items finishes well inside the default executor time
 * limit, and a page of `default` items finishes inside it even when the app
 * is several times slower than usual.
 */
export const PAGE_SIZE_LIMITS: { readonly default: number; readonly maximum: number } =
  Object.freeze({ default: 25, maximum: 100 })

/**
 * The input names every list operation reserves for paging. No app parameter
 * of a list operation may use either name, so a list that does not page yet
 * can start paging without renaming one.
 */
export const PAGING_INPUT_NAMES: readonly ['pageSize', 'cursor'] = Object.freeze([
  'pageSize',
  'cursor',
] as const)

/** The record fields {@link ValueTypeConstructors.pageInputs} contributes to a list input. */
export interface PageInputFields {
  /** The requested page size. */
  readonly pageSize: OptionalField<Integer>
  /** The continuation from the previous page. */
  readonly cursor: OptionalField<string>
}

/**
 * The value type of a {@link Page}, made with {@link ValueTypeConstructors.page}.
 *
 * @remarks
 * It is an ordinary value type of `Page<T>` that also exposes the value type
 * of one item, so that code which needs the items without the page (a
 * collection reference resolves to an array of items, not a page) derives
 * that from the same composition.
 *
 * @typeParam T - The listed item.
 */
export interface PageValueType<T> extends ValueType<Page<T>> {
  /** The value type of one item of the page. */
  readonly item: ValueType<T>
}

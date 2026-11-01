/**
 * References to app objects, and how they hydrate.
 *
 * A reference either identifies particular objects (identity form) or
 * describes a rule that selects whatever matches when it is resolved (selector
 * form). Independently, it denotes one object or a collection. These are two
 * separate axes, and neither is a success/error distinction.
 *
 * Three shapes are distinguished:
 *
 * - {@link ObjectReference}: one object; resolving a missing target fails.
 * - {@link CollectionReference}: a deferred collection whose membership is
 *   decided when it is resolved; an empty result is a valid result.
 * - {@link ReferenceList}: a materialized array whose entries are already
 *   decided, though each entry's target can still change or disappear.
 *
 * Results keep their precise types: a single reference resolves to one record,
 * a collection to an array, and nothing is flattened or eagerly hydrated. App
 * contracts, not this module, own identity persistence and referential
 * integrity.
 *
 * @packageDocumentation
 */

import type { CallOptions } from '../call-options.js'
import type { Integer } from '../values/integer.js'
import type { WireInteger, WireValue } from '../values/wire.js'

/** Whether a reference identifies objects or selects them by rule. */
export type ReferenceForm = 'identity' | 'selector'

/** Whether a reference denotes one object or a collection. */
export type ReferenceCardinality = 'one' | 'many'

/**
 * Anything that hydrates into a result.
 *
 * @remarks
 * The broadest view: generic consumers (sync, output, forwarding to an agent)
 * can accept any `Resolvable` without inspecting form or cardinality, and still
 * receive a typed result.
 */
export interface Resolvable<Result> {
  /** Hydrate the reference through the client that produced it. */
  resolve(options?: CallOptions): Promise<Result>
}

/**
 * A reference to exactly one object.
 *
 * @remarks
 * Resolving yields the object's record, or fails with a target-not-found error
 * if nothing matches. Duplicate-name behavior is app-defined.
 */
export interface ObjectReference<T> extends Resolvable<T> {
  /** The manifest resource key of the referenced object. */
  readonly resource: string
  /** How the object is denoted. */
  readonly form: ReferenceForm
  /** Always `'one'`. */
  readonly cardinality: 'one'
}

/**
 * A deferred reference to a collection.
 *
 * @remarks
 * Membership is determined when the reference is resolved. Resolving yields an
 * array that may be empty; an invalid range fails with an invalid-selection
 * error, never with an empty result.
 */
export interface CollectionReference<T> extends Resolvable<readonly T[]> {
  /** The manifest resource key of the collection's members. */
  readonly resource: string
  /** How the members are denoted. */
  readonly form: ReferenceForm
  /** Always `'many'`. */
  readonly cardinality: 'many'
}

/** Either cardinality of reference. */
export type AnyReference<T> = ObjectReference<T> | CollectionReference<T>

/** Select the object with a given name within its container. */
export interface NameSelector {
  /** Selection form. */
  readonly by: 'name'
  /** The name to match. */
  readonly name: string
}

/** Select the object at a zero-based position within its container. */
export interface IndexSelector {
  /** Selection form. */
  readonly by: 'index'
  /** Zero-based position. */
  readonly index: Integer
}

/** A selection rule that denotes one object. */
export type ObjectSelector = NameSelector | IndexSelector

/** Select every object in the container. */
export interface EverySelector {
  /** Selection form. */
  readonly by: 'every'
}

/** Select the objects at zero-based positions `start` (inclusive) to `end` (exclusive). */
export interface RangeSelector {
  /** Selection form. */
  readonly by: 'range'
  /** First position, inclusive. */
  readonly start: Integer
  /** Last position, exclusive. */
  readonly end: Integer
}

/** A selection rule that denotes a collection. */
export type CollectionSelector = EverySelector | RangeSelector

/** One object denoted by its identifier. */
export interface IdentityReference<T, Id = string> extends ObjectReference<T> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The app-defined identifier of the object. */
  readonly id: Id
  /** The object's container, where identity is scoped to one. */
  readonly container?: ObjectReference<unknown>
}

/** One object denoted by a selection rule. */
export interface SelectorReference<T> extends ObjectReference<T> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The rule that selects the object at resolution time. */
  readonly selector: ObjectSelector
  /** The container the rule is evaluated in. */
  readonly container?: ObjectReference<unknown>
}

/**
 * A deferred collection of explicitly identified objects.
 *
 * @remarks
 * Its entries are an explicit, ordered list that callers edit by reordering or
 * replacing entries, unlike a selector collection, which callers edit by
 * changing the rule.
 */
export interface IdentityCollectionReference<T, Id = string> extends CollectionReference<T> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The identified members, in order. */
  readonly entries: readonly IdentityReference<T, Id>[]
}

/** A deferred collection denoted by a selection rule. */
export interface SelectorCollectionReference<T> extends CollectionReference<T> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The rule that selects the members at resolution time. */
  readonly selector: CollectionSelector
  /** The container the rule is evaluated in. */
  readonly container?: ObjectReference<unknown>
}

/**
 * A materialized collection: an array whose reference entries are already
 * decided.
 *
 * @remarks
 * Not itself resolvable; each entry resolves independently. It is neither a
 * data snapshot nor an immutable identity of its targets.
 */
export type ReferenceList<R extends ObjectReference<unknown>> = readonly R[]

/** Wire form of an {@link ObjectSelector}. */
export type ObjectSelectorWire =
  | { readonly by: 'name'; readonly name: string }
  | { readonly by: 'index'; readonly index: WireInteger }

/** Wire form of a {@link CollectionSelector}. */
export type CollectionSelectorWire =
  | { readonly by: 'every' }
  | { readonly by: 'range'; readonly start: WireInteger; readonly end: WireInteger }

/**
 * Wire form of a reference: the payload of a `reference` control record.
 *
 * @remarks
 * `form` and `cardinality` are both always present, so every variant is
 * discriminated by the pair.
 */
export type ReferenceWire =
  | {
      readonly resource: string
      readonly form: 'identity'
      readonly cardinality: 'one'
      readonly id: WireValue
      readonly container?: ReferenceWire
    }
  | {
      readonly resource: string
      readonly form: 'selector'
      readonly cardinality: 'one'
      readonly selector: ObjectSelectorWire
      readonly container?: ReferenceWire
    }
  | {
      readonly resource: string
      readonly form: 'identity'
      readonly cardinality: 'many'
      readonly entries: readonly ReferenceWire[]
    }
  | {
      readonly resource: string
      readonly form: 'selector'
      readonly cardinality: 'many'
      readonly selector: CollectionSelectorWire
      readonly container?: ReferenceWire
    }

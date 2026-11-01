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
 * Every concrete reference exists in two forms. Its **data** form
 * ({@link ReferenceData}) is what a reference denotes: resource, form,
 * cardinality, and the identifier, entries, or selector, plus any container.
 * Its **bound** form adds {@link Resolvable}: it is the data form of a
 * reference that a client decoded, so it hydrates through that client. A
 * bound reference is assignable to its data form, so anything that accepts
 * data (encoding in particular) accepts a bound reference unchanged.
 *
 * @packageDocumentation
 */

import type { CallOptions } from '../call-options.js'
import type { Integer } from '../values/integer.js'
import type { ValueType } from '../values/value-type.js'
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

/**
 * Select the object at a zero-based position within its container.
 *
 * @remarks
 * Positions are zero-based and non-negative: `0` is the first object. A
 * negative position is invalid; a position past the end is detectable only
 * when the reference is resolved.
 */
export interface IndexSelector {
  /** Selection form. */
  readonly by: 'index'
  /** Zero-based, non-negative position. */
  readonly index: Integer
}

/** A selection rule that denotes one object. */
export type ObjectSelector = NameSelector | IndexSelector

/** Select every object in the container. */
export interface EverySelector {
  /** Selection form. */
  readonly by: 'every'
}

/**
 * Select the objects at zero-based positions `start` (inclusive) to `end`
 * (exclusive).
 *
 * @remarks
 * The range is half-open, following JavaScript conventions:
 * `{ start: 0, end: 10 }` selects the first ten objects. Both bounds are non-negative and
 * `start <= end`; `start === end` is a valid, empty range. A range that
 * extends past the end of the collection is detectable only when the
 * reference is resolved, where it fails with an invalid-selection error.
 */
export interface RangeSelector {
  /** Selection form. */
  readonly by: 'range'
  /** First position, inclusive; zero-based and non-negative. */
  readonly start: Integer
  /** Position after the last, exclusive; at least `start`. */
  readonly end: Integer
}

/** A selection rule that denotes a collection. */
export type CollectionSelector = EverySelector | RangeSelector

/**
 * Data form of one object denoted by its identifier.
 *
 * @remarks
 * `id` is the app-defined identifier in its SDK form, as the resource's
 * identifier value type decodes it.
 *
 * @typeParam Id - The SDK type of the resource's identifier.
 */
export interface IdentityReferenceData<Id = unknown> {
  /** The manifest resource key of the referenced object. */
  readonly resource: string
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** Always `'one'`. */
  readonly cardinality: 'one'
  /** The app-defined identifier of the object. */
  readonly id: Id
  /** The object's container, where identity is scoped to one. */
  readonly container?: ObjectReferenceData
}

/** Data form of one object denoted by a selection rule. */
export interface SelectorReferenceData {
  /** The manifest resource key of the referenced object. */
  readonly resource: string
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** Always `'one'`. */
  readonly cardinality: 'one'
  /** The rule that selects the object at resolution time. */
  readonly selector: ObjectSelector
  /** The container the rule is evaluated in. */
  readonly container?: ObjectReferenceData
}

/**
 * Data form of a deferred collection of explicitly identified objects.
 *
 * @remarks
 * Every entry is a single identity reference to the collection's own
 * resource. The collection itself has no container; each entry carries its
 * own when its identity is scoped to one.
 *
 * @typeParam Id - The SDK type of the resource's identifier.
 */
export interface IdentityCollectionReferenceData<Id = unknown> {
  /** The manifest resource key of the collection's members. */
  readonly resource: string
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** Always `'many'`. */
  readonly cardinality: 'many'
  /** The identified members, in order. */
  readonly entries: readonly IdentityReferenceData<Id>[]
}

/** Data form of a deferred collection denoted by a selection rule. */
export interface SelectorCollectionReferenceData {
  /** The manifest resource key of the collection's members. */
  readonly resource: string
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** Always `'many'`. */
  readonly cardinality: 'many'
  /** The rule that selects the members at resolution time. */
  readonly selector: CollectionSelector
  /** The container the rule is evaluated in. */
  readonly container?: ObjectReferenceData
}

/** Data form of a single-object reference, of either form. */
export type ObjectReferenceData = IdentityReferenceData | SelectorReferenceData

/** Data form of a collection reference, of either form. */
export type CollectionReferenceData =
  | IdentityCollectionReferenceData
  | SelectorCollectionReferenceData

/**
 * Data form of any reference: what a reference denotes, with no ability to
 * resolve it.
 *
 * @remarks
 * This is what decoding hands to `DecodeContext.bindReference`, with
 * identifiers decoded through the app's resource table, selector positions as
 * `Integer`, and containers as nested data. It is also exactly what encoding
 * reads: every bound reference is assignable to its data form.
 */
export type ReferenceData = ObjectReferenceData | CollectionReferenceData

/**
 * One object denoted by its identifier, bound to the client that decoded it.
 *
 * @remarks
 * Its data form ({@link IdentityReferenceData}) plus {@link Resolvable}.
 */
export interface IdentityReference<T, Id = string>
  extends IdentityReferenceData<Id>, ObjectReference<T> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The object's container, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown, unknown>
}

/**
 * One object denoted by a selection rule, bound to the client that decoded
 * it.
 *
 * @remarks
 * Its data form ({@link SelectorReferenceData}) plus {@link Resolvable}.
 */
export interface SelectorReference<T> extends SelectorReferenceData, ObjectReference<T> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The container the rule is evaluated in, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown, unknown>
}

/**
 * A deferred collection of explicitly identified objects, bound to the client
 * that decoded it.
 *
 * @remarks
 * Its entries are an explicit, ordered list that callers edit by reordering or
 * replacing entries, unlike a selector collection, which callers edit by
 * changing the rule. Its data form is {@link IdentityCollectionReferenceData}.
 */
export interface IdentityCollectionReference<T, Id = string>
  extends IdentityCollectionReferenceData<Id>, CollectionReference<T> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The identified members, in order, each bound to the same client. */
  readonly entries: readonly IdentityReference<T, Id>[]
}

/**
 * A deferred collection denoted by a selection rule, bound to the client that
 * decoded it.
 *
 * @remarks
 * Its data form ({@link SelectorCollectionReferenceData}) plus
 * {@link Resolvable}.
 */
export interface SelectorCollectionReference<T>
  extends SelectorCollectionReferenceData, CollectionReference<T> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The container the rule is evaluated in, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown, unknown>
}

/**
 * What a typed single-object reference position holds: a bound reference to
 * one `T`, in either form.
 *
 * @remarks
 * A typed position accepts both forms of its cardinality, so its value is
 * this union rather than one form. Narrow on `form` to reach the identifier or
 * the selector. Broad consumers that only resolve can use
 * {@link ObjectReference} instead.
 *
 * @typeParam T - The referenced record.
 * @typeParam Id - The SDK type of the resource's identifier.
 */
export type ObjectReferenceVariant<T, Id = string> = IdentityReference<T, Id> | SelectorReference<T>

/**
 * What a typed collection reference position holds: a bound deferred
 * collection of `T`, in either form.
 *
 * @remarks
 * The collection counterpart of {@link ObjectReferenceVariant}. Broad
 * consumers that only resolve can use {@link CollectionReference} instead.
 *
 * @typeParam T - The member record.
 * @typeParam Id - The SDK type of the resource's identifier.
 */
export type CollectionReferenceVariant<T, Id = string> =
  | IdentityCollectionReference<T, Id>
  | SelectorCollectionReference<T>

/**
 * What a reference value type needs to know about every resource a reference
 * can name, keyed by manifest resource key.
 *
 * @remarks
 * Each entry carries the resource's identifier value type, which encodes and
 * decodes the `id` of identity references to that resource. A reference's
 * containers usually belong to other resources, so the table covers every
 * resource of the app, not only the one a position declares. An app
 * contract's `resources` table is assignable to this type, so generated code
 * passes that table rather than building a parallel one.
 */
export type ReferenceRegistry = Readonly<Record<string, { readonly id: ValueType<unknown> }>>

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

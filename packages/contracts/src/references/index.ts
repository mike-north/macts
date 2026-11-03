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
 * ({@link ReferenceData}) is what a reference denotes: the app it belongs to,
 * resource, form, cardinality, and the identifier, entries, or selector, plus
 * any container.
 * Its **bound** form adds {@link Resolvable}: it is the data form of a
 * reference that a client decoded, so it hydrates through that client. A
 * bound reference is assignable to its data form, so anything that accepts
 * data (encoding in particular) accepts a bound reference unchanged.
 *
 * Typed positions use the two forms by direction. An output position holds a
 * bound reference ({@link ObjectReferenceVariant}), because a client decoded
 * it. An input position takes the data form ({@link ObjectReferenceData}), so
 * a caller can pass either a reference it built (an identifier or a selector)
 * or one it received. At a typed position the resource key is a literal type
 * and the cardinality is fixed, so a reference to another resource, or of the
 * other cardinality, does not type-check.
 *
 * A reference names its app because resource keys repeat across apps (many
 * apps have a `document`): a reference to one app's object must never be
 * accepted where another app's reference is expected. The app is part of the
 * data form only. The wire form leaves it out, because the route a reference
 * travels on already names the app; decoding supplies it from the app
 * contract.
 *
 * @packageDocumentation
 */

import type { CallOptions } from '../call-options.js'
import type { OperationId } from '../operations/index.js'
import type { Integer } from '../values/integer.js'
import type { ResourcePlanTable, ResourcePlans } from '../values/plan.js'
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
 *
 * @typeParam T - The referenced record.
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export interface ObjectReference<T, R extends string = string> extends Resolvable<T> {
  /** The app the referenced object belongs to: its contract's `app`. */
  readonly app: string
  /** The manifest resource key of the referenced object. */
  readonly resource: R
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
 *
 * @typeParam T - The member record.
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export interface CollectionReference<T, R extends string = string> extends Resolvable<
  readonly T[]
> {
  /** The app the collection's members belong to: its contract's `app`. */
  readonly app: string
  /** The manifest resource key of the collection's members. */
  readonly resource: R
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
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export interface IdentityReferenceData<Id = unknown, R extends string = string> {
  /**
   * The app the reference belongs to: the `app` of the contract it is used
   * with. It is not carried on the wire.
   */
  readonly app: string
  /** The manifest resource key of the referenced object. */
  readonly resource: R
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** Always `'one'`. */
  readonly cardinality: 'one'
  /** The app-defined identifier of the object. */
  readonly id: Id
  /** The object's container, where identity is scoped to one. */
  readonly container?: ObjectReferenceData
}

/**
 * Data form of one object denoted by a selection rule.
 *
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export interface SelectorReferenceData<R extends string = string> {
  /**
   * The app the reference belongs to: the `app` of the contract it is used
   * with. It is not carried on the wire.
   */
  readonly app: string
  /** The manifest resource key of the referenced object. */
  readonly resource: R
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
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export interface IdentityCollectionReferenceData<Id = unknown, R extends string = string> {
  /**
   * The app the reference belongs to: the `app` of the contract it is used
   * with. It is not carried on the wire.
   */
  readonly app: string
  /** The manifest resource key of the collection's members. */
  readonly resource: R
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** Always `'many'`. */
  readonly cardinality: 'many'
  /** The identified members, in order. */
  readonly entries: readonly IdentityReferenceData<Id, R>[]
}

/**
 * Data form of a deferred collection denoted by a selection rule.
 *
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export interface SelectorCollectionReferenceData<R extends string = string> {
  /**
   * The app the reference belongs to: the `app` of the contract it is used
   * with. It is not carried on the wire.
   */
  readonly app: string
  /** The manifest resource key of the collection's members. */
  readonly resource: R
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** Always `'many'`. */
  readonly cardinality: 'many'
  /** The rule that selects the members at resolution time. */
  readonly selector: CollectionSelector
  /** The container the rule is evaluated in. */
  readonly container?: ObjectReferenceData
}

/**
 * Data form of a single-object reference, of either form.
 *
 * @remarks
 * This is what a typed single-object input position accepts: a caller can
 * build either form, and a bound reference to the same resource (an
 * {@link ObjectReferenceVariant}) is assignable to it. The resource key is a
 * literal type at a typed position, so a reference to another resource is
 * not.
 *
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export type ObjectReferenceData<Id = unknown, R extends string = string> =
  | IdentityReferenceData<Id, R>
  | SelectorReferenceData<R>

/**
 * Data form of a collection reference, of either form.
 *
 * @remarks
 * The collection counterpart of {@link ObjectReferenceData}: what a typed
 * collection input position accepts.
 *
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export type CollectionReferenceData<Id = unknown, R extends string = string> =
  | IdentityCollectionReferenceData<Id, R>
  | SelectorCollectionReferenceData<R>

/**
 * Data form of any reference: what a reference denotes, with no ability to
 * resolve it.
 *
 * @remarks
 * This is what decoding hands to `DecodeContext.bindReference`, with
 * identifiers decoded through the app's resource table, selector positions as
 * `Integer`, containers as nested data, and `app` set from the app contract at
 * every level. It is also exactly what encoding reads: every bound reference
 * is assignable to its data form.
 */
export type ReferenceData = ObjectReferenceData | CollectionReferenceData

/**
 * One object denoted by its identifier, bound to the client that decoded it.
 *
 * @remarks
 * Its data form ({@link IdentityReferenceData}) plus {@link Resolvable}.
 *
 * @typeParam T - The referenced record.
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export interface IdentityReference<T, Id = unknown, R extends string = string>
  extends IdentityReferenceData<Id, R>, ObjectReference<T, R> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The object's container, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown>
}

/**
 * One object denoted by a selection rule, bound to the client that decoded
 * it.
 *
 * @remarks
 * Its data form ({@link SelectorReferenceData}) plus {@link Resolvable}.
 *
 * @typeParam T - The referenced record.
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export interface SelectorReference<T, R extends string = string>
  extends SelectorReferenceData<R>, ObjectReference<T, R> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The container the rule is evaluated in, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown>
}

/**
 * A deferred collection of explicitly identified objects, bound to the client
 * that decoded it.
 *
 * @remarks
 * Its entries are an explicit, ordered list that callers edit by reordering or
 * replacing entries, unlike a selector collection, which callers edit by
 * changing the rule. Its data form is {@link IdentityCollectionReferenceData}.
 *
 * @typeParam T - The member record.
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export interface IdentityCollectionReference<T, Id = unknown, R extends string = string>
  extends IdentityCollectionReferenceData<Id, R>, CollectionReference<T, R> {
  /** Always `'identity'`. */
  readonly form: 'identity'
  /** The identified members, in order, each bound to the same client. */
  readonly entries: readonly IdentityReference<T, Id, R>[]
}

/**
 * A deferred collection denoted by a selection rule, bound to the client that
 * decoded it.
 *
 * @remarks
 * Its data form ({@link SelectorCollectionReferenceData}) plus
 * {@link Resolvable}.
 *
 * @typeParam T - The member record.
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export interface SelectorCollectionReference<T, R extends string = string>
  extends SelectorCollectionReferenceData<R>, CollectionReference<T, R> {
  /** Always `'selector'`. */
  readonly form: 'selector'
  /** The container the rule is evaluated in, bound to the same client. */
  readonly container?: ObjectReferenceVariant<unknown>
}

/**
 * What a typed single-object output position holds: a bound reference to one
 * `T`, in either form.
 *
 * @remarks
 * A typed position holds both forms of its cardinality, so its value is this
 * union rather than one form. An input position takes the data form instead
 * ({@link ObjectReferenceData}), to which this type is assignable. Narrow on `form` to reach the identifier or
 * the selector. Broad consumers that only resolve can use
 * {@link ObjectReference} instead.
 *
 * @typeParam T - The referenced record.
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the referenced object, as a literal
 *   type where the position is typed.
 */
export type ObjectReferenceVariant<T, Id = unknown, R extends string = string> =
  | IdentityReference<T, Id, R>
  | SelectorReference<T, R>

/**
 * What a typed collection output position holds: a bound deferred collection
 * of `T`, in either form.
 *
 * @remarks
 * The collection counterpart of {@link ObjectReferenceVariant}. Broad
 * consumers that only resolve can use {@link CollectionReference} instead.
 *
 * @typeParam T - The member record.
 * @typeParam Id - The SDK type of the resource's identifier.
 * @typeParam R - The manifest resource key of the collection's members, as a
 *   literal type where the position is typed.
 */
export type CollectionReferenceVariant<T, Id = unknown, R extends string = string> =
  | IdentityCollectionReference<T, Id, R>
  | SelectorCollectionReference<T, R>

/**
 * What a reference value type needs to know about every resource a reference
 * can name, keyed by manifest resource key.
 *
 * @remarks
 * Each entry carries the resource's identifier value type, when the resource
 * has an identifier; it encodes and decodes the `id` of identity references
 * to that resource. A resource without an identifier (`id` absent) can be
 * referenced only by selector forms: name, index, every, or range. A reference's
 * containers usually belong to other resources, so the table covers every
 * resource of the app, not only the one a position declares.
 *
 * Each entry also names the operations that resolve references to the
 * resource, where it has them: `get` resolves a single-object reference and
 * `list` a collection. Every resolvable object needs its resolving
 * operation (`get` for a single object, a container, and an
 * identity-collection entry; `list` for a collection), because a reference
 * that names a resource without it could never be resolved. Reference value
 * types enforce this in their wire schema, so every boundary applies it. An
 * app contract's `resources` table is assignable to this
 * type; reference value types read it through the {@link ReferenceScope}.
 */
export type ReferenceRegistry = Readonly<
  Record<
    string,
    {
      readonly id?: ValueType<unknown>
      readonly get?: OperationId
      readonly list?: OperationId
    }
  >
>

/**
 * What a reference value type needs to know about the app its references
 * belong to: the app and its resource table.
 *
 * @remarks
 * `app` is the app contract's `app`. Decoding stamps it on every reference,
 * container, and entry it produces, and encoding rejects a reference whose
 * `app` differs, at any level, before any call is made. `resources` is the
 * {@link ReferenceRegistry}, which also admits a resource as a container only
 * when it has `get`. An app contract is assignable to this type, so
 * generated code passes the contract itself rather than building a parallel
 * description of the app.
 */
export interface ReferenceScope {
  /** The app's route segment, for example `'calendar'`. */
  readonly app: string
  /** The app's resource table. */
  readonly resources: ReferenceRegistry
}

/**
 * The value plans of an app's resources, derived from its resource table: each
 * resource's identifier plan, taken from the identifier value type the table
 * records for it.
 *
 * @remarks
 * Every resource of the table has an entry, including those with no
 * identifier, whose entry is empty: a reference's containers usually belong to
 * other resources, so an executor needs the whole table, not only the
 * resources a position declares. Hosts derive it once, when an app's contract
 * is registered, and pass it with every request.
 *
 * @param resources - The app contract's resource table.
 * @returns A frozen table with one entry per resource, in table order.
 */
export function resourcePlanTable(resources: ReferenceRegistry): ResourcePlanTable {
  // `Object.fromEntries` defines own properties, so no resource key (not even
  // `__proto__`) can reach the table's prototype.
  return Object.freeze(
    Object.fromEntries(
      Object.entries(resources).map(([resource, descriptor]): [string, ResourcePlans] => [
        resource,
        Object.freeze(descriptor.id === undefined ? {} : { id: descriptor.id.plan }),
      ])
    )
  )
}

/**
 * The field of a resource's table entry ({@link ReferenceRegistry}, and so
 * `ResourceDescriptor`) that names the operation a reference of
 * `cardinality` resolves as: `get` for a single object, `list` for a
 * collection.
 *
 * @remarks
 * This is the one statement of which operation resolves a reference. Every
 * resolvable object is a reference of one of the two cardinalities: a
 * container and an identity-collection entry are single-object references, so
 * they resolve through `get` like any other. Reference value types use it to
 * admit only resolvable references, the runtime to pick the operation a
 * resolution runs as, and clients to pick the output contract a resolution's
 * result is decoded with.
 *
 * @param cardinality - The cardinality of the reference being resolved.
 * @returns `'get'` for `'one'`, `'list'` for `'many'`.
 */
export function resolvingOperationKey(cardinality: ReferenceCardinality): 'get' | 'list' {
  return cardinality === 'one' ? 'get' : 'list'
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

/**
 * References bound to the client that decoded them.
 *
 * Decoding a reference yields its data form (phases/13 D7). A client binds
 * that data to itself, so the reference's `resolve()` hydrates it through the
 * same client: the same locality, credential, and governance as the call that
 * returned it. Every container and every identity-collection entry is bound
 * the same way, each with its own `resolve`.
 *
 * A bound reference must stay valid encode input, because a caller can pass
 * one it received to any operation that takes a reference. Under the encode
 * strictness rule (phases/13 D8) any own enumerable property that is not a
 * declared data field makes encoding fail, so a bound reference's own
 * enumerable properties are exactly its data fields. The client it resolves
 * through is a `#private` field, and `resolve` is a prototype member, so
 * neither is ever encoded, serialized, or compared as data.
 *
 * This module depends only on `@macts/contracts`, because the remote entry
 * point uses it and must never load the Mac-side runtime.
 *
 * @packageDocumentation
 */

import {
  InternalError,
  type CallOptions,
  type CollectionReferenceVariant,
  type CollectionSelector,
  type IdentityCollectionReference,
  type IdentityCollectionReferenceData,
  type IdentityReference,
  type IdentityReferenceData,
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type ObjectSelector,
  type ReferenceData,
  type SelectorCollectionReference,
  type SelectorCollectionReferenceData,
  type SelectorReference,
  type SelectorReferenceData,
} from '@macts/contracts'

/**
 * Resolves a reference's data through the client a bound reference belongs
 * to; the client runtime's `resolve`.
 */
export type ReferenceResolver = (
  reference: ReferenceData,
  options: CallOptions | undefined
) => Promise<unknown>

/**
 * What every bound reference shares: the client it resolves through, held
 * privately, and `resolve`, which hands the reference's own data to it.
 *
 * @typeParam Result - What resolving yields: a record for a single object, an
 *   array of records for a collection.
 */
abstract class ClientBoundReference<Result> {
  readonly #resolver: ReferenceResolver

  protected constructor(resolver: ReferenceResolver) {
    this.#resolver = resolver
  }

  /** This reference as the data form it denotes. */
  protected abstract data(): ReferenceData

  /** The resolved value, as this reference's cardinality shapes it. */
  protected abstract settle(resolved: unknown): Result

  /** Hydrate the reference through the client that decoded it. */
  async resolve(options?: CallOptions): Promise<Result> {
    return this.settle(await this.#resolver(this.data(), options))
  }
}

/** A single object resolves to its record, which the client has already decoded. */
abstract class BoundObjectReference extends ClientBoundReference<unknown> {
  protected override settle(resolved: unknown): unknown {
    return resolved
  }
}

/**
 * A collection resolves to an array of records.
 *
 * @remarks
 * The client decoded the result with the output contract of the resource's
 * `list` operation, so a result that is not an array means that contract does
 * not describe a list: a defect of the contract, not of the call.
 */
abstract class BoundCollectionReference extends ClientBoundReference<readonly unknown[]> {
  protected override settle(resolved: unknown): readonly unknown[] {
    if (!Array.isArray(resolved)) {
      throw new InternalError(
        'A collection reference resolved to a value that is not an array: the contract of the ' +
          "resource's list operation does not describe a list.",
        {}
      )
    }
    return resolved
  }
}

/** One object denoted by its identifier. */
class BoundIdentityReference extends BoundObjectReference implements IdentityReference<unknown> {
  readonly app: string
  readonly resource: string
  readonly form = 'identity'
  readonly cardinality = 'one'
  readonly id: unknown
  // Declared, not initialized, so an absent container is an absent property
  // rather than an own `undefined`.
  declare readonly container?: ObjectReferenceVariant<unknown>

  constructor(data: IdentityReferenceData, resolver: ReferenceResolver) {
    super(resolver)
    this.app = data.app
    this.resource = data.resource
    this.id = data.id
    if (data.container !== undefined) this.container = bindObject(data.container, resolver)
  }

  protected override data(): ReferenceData {
    return this
  }
}

/** One object denoted by a selection rule. */
class BoundSelectorReference extends BoundObjectReference implements SelectorReference<unknown> {
  readonly app: string
  readonly resource: string
  readonly form = 'selector'
  readonly cardinality = 'one'
  readonly selector: ObjectSelector
  declare readonly container?: ObjectReferenceVariant<unknown>

  constructor(data: SelectorReferenceData, resolver: ReferenceResolver) {
    super(resolver)
    this.app = data.app
    this.resource = data.resource
    this.selector = data.selector
    if (data.container !== undefined) this.container = bindObject(data.container, resolver)
  }

  protected override data(): ReferenceData {
    return this
  }
}

/** A deferred collection of explicitly identified objects. */
class BoundIdentityCollectionReference
  extends BoundCollectionReference
  implements IdentityCollectionReference<unknown>
{
  readonly app: string
  readonly resource: string
  readonly form = 'identity'
  readonly cardinality = 'many'
  readonly entries: readonly IdentityReference<unknown>[]

  constructor(data: IdentityCollectionReferenceData, resolver: ReferenceResolver) {
    super(resolver)
    this.app = data.app
    this.resource = data.resource
    this.entries = data.entries.map((entry) => new BoundIdentityReference(entry, resolver))
  }

  protected override data(): ReferenceData {
    return this
  }
}

/** A deferred collection denoted by a selection rule. */
class BoundSelectorCollectionReference
  extends BoundCollectionReference
  implements SelectorCollectionReference<unknown>
{
  readonly app: string
  readonly resource: string
  readonly form = 'selector'
  readonly cardinality = 'many'
  readonly selector: CollectionSelector
  declare readonly container?: ObjectReferenceVariant<unknown>

  constructor(data: SelectorCollectionReferenceData, resolver: ReferenceResolver) {
    super(resolver)
    this.app = data.app
    this.resource = data.resource
    this.selector = data.selector
    if (data.container !== undefined) this.container = bindObject(data.container, resolver)
  }

  protected override data(): ReferenceData {
    return this
  }
}

/** Bind a single-object reference of either form. */
function bindObject(
  data: ObjectReferenceData,
  resolver: ReferenceResolver
): ObjectReferenceVariant<unknown> {
  return data.form === 'identity'
    ? new BoundIdentityReference(data, resolver)
    : new BoundSelectorReference(data, resolver)
}

/**
 * Bind decoded reference data to a client.
 *
 * @remarks
 * The result is the bound form of the same variant, with the same data
 * fields, and its containers and entries bound as well, as
 * `DecodeContext.bindReference` requires. Each level's `resolve` passes that
 * level's own data to `resolver`.
 *
 * @param data - Decoded reference data.
 * @param resolver - The resolving client.
 * @returns The bound reference.
 */
export function bindReference(
  data: ReferenceData,
  resolver: ReferenceResolver
): ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown> {
  if (data.cardinality === 'one') return bindObject(data, resolver)
  return data.form === 'identity'
    ? new BoundIdentityCollectionReference(data, resolver)
    : new BoundSelectorCollectionReference(data, resolver)
}

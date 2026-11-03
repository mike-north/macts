/**
 * The resource table of an app contract as a type, and what it tells the type
 * system about references.
 *
 * A generated contract keeps its resource table's literal type: each resource
 * key, which of `get` and `list` it records, and its record and identifier
 * types. A client created from the contract carries that type in a
 * {@link ClientBrand}, which exists only at the type level. The types here
 * read the table to say which reference data a client can bind, because a
 * reference is resolvable only through the operation its resource records
 * for its cardinality (`resolvingOperationKey`): `get` for a single object,
 * a container, and an identity-collection entry; `list` for a collection. A
 * resource whose entry names a `parent` is found only within an object of
 * that parent, so data referencing it must carry an identity reference to
 * the parent as its container.
 *
 * A table whose keys are not known (the default {@link ResourceTable}, used by
 * a contract that declares no table type) admits any reference data, with
 * records and identifiers of type `unknown`, because nothing about it can be
 * checked statically. Encoding still checks every reference at runtime.
 *
 * @packageDocumentation
 */

import type {
  IdentityCollectionReference,
  IdentityCollectionReferenceData,
  IdentityReference,
  IdentityReferenceData,
  ObjectReferenceVariant,
  ReferenceCardinality,
  ReferenceData,
  SelectorCollectionReference,
  SelectorCollectionReferenceData,
  SelectorReference,
  SelectorReferenceData,
} from '../references/index.js'
import type { ValueType } from '../values/value-type.js'
import type { OperationId, ResourceDescriptor } from './index.js'

/**
 * An app contract's resource table: every resource references can point to,
 * keyed by manifest resource key.
 *
 * @remarks
 * This is the widest table, whose keys are not known. A generated contract
 * declares a narrower one, the literal type of its table, so that its
 * clients can check references statically.
 */
export type ResourceTable = Readonly<Record<string, ResourceDescriptor<unknown>>>

/**
 * Type-level key of the client brand. Declared, never defined: it has no
 * runtime existence and is deliberately not exported, so no client ever
 * carries a property under it.
 */
declare const clientResources: unique symbol

/**
 * The resource table of the contract a client was created from, carried in
 * the client's type.
 *
 * @remarks
 * Client factories return `Client & ClientBrand<Resources>`, and a generated
 * client interface extends `ClientBrand` of its contract's table, so a value
 * annotated with that interface carries the table too. The brand is an
 * optional member under a symbol that does not exist at runtime, so a client
 * has no such property, and the app's operations stay its only members. It
 * lets functions that take a client, such as `bindReference`, read the
 * contract's table from the client's type.
 *
 * @typeParam Resources - The contract's resource table type.
 */
export interface ClientBrand<Resources extends ResourceTable> {
  /** The contract's resource table type. Never present at runtime. */
  readonly [clientResources]?: Resources
}

/**
 * The resource keys of `Resources` that references of `Cardinality` can
 * resolve through: those whose entry records `get` for `'one'`, or `list` for
 * `'many'`.
 *
 * @remarks
 * A container and an identity-collection entry are single-object references,
 * so their resource must be a key for `'one'`. The field counts as present
 * only when the entry's type requires it: an entry built on
 * `ResourceDescriptor`, which declares `get` and `list` optional, records
 * one by narrowing it to required. For a table whose keys are not known, this
 * is `string`.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Cardinality - The cardinality of the reference.
 */
export type ResolvableResourceKey<
  Resources extends ResourceTable,
  Cardinality extends ReferenceCardinality,
> =
  // A table whose keys are not known admits every key.
  string extends keyof Resources
    ? string
    : {
        // The field `resolvingOperationKey(Cardinality)` names must be present.
        [Key in keyof Resources & string]: Resources[Key] extends Readonly<
          Record<Cardinality extends 'one' ? 'get' : 'list', OperationId>
        >
          ? Key
          : never
      }[keyof Resources & string]

/**
 * The SDK record of resource `Key` in `Resources`: the type its `record`
 * value type decodes, or `unknown` when the table does not say.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Key - The resource key.
 */
export type ResourceRecordOf<
  Resources extends ResourceTable,
  Key extends string,
> = Key extends keyof Resources
  ? Resources[Key] extends { readonly record: ValueType<infer RecordType> }
    ? RecordType
    : unknown
  : unknown

/**
 * The SDK identifier of resource `Key` in `Resources`: the type its `id`
 * value type decodes.
 *
 * @remarks
 * `never` when the resource has no identifier, so an identity reference to
 * it, which encoding rejects, does not type-check either. `unknown` for a
 * table whose keys are not known.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Key - The resource key.
 */
export type ResourceIdOf<
  Resources extends ResourceTable,
  Key extends string,
> = string extends keyof Resources
  ? unknown
  : Key extends keyof Resources
    ? Resources[Key] extends { readonly id: ValueType<infer Id> }
      ? Id
      : never
    : never

/**
 * The `container` of resolvable reference data to a resource found at the
 * application: optional, and single-object reference data to a resource with
 * `get`, whose own container is likewise, or a reference a client bound.
 *
 * @remarks
 * A bound reference's resource is not a literal type, but a client decoded it
 * through the same app's contract, which admits only resolvable containers.
 *
 * @typeParam Resources - The contract's resource table type.
 */
export interface ResolvableContainment<Resources extends ResourceTable> {
  /** The container, which resolves through its resource's `get`. */
  readonly container?: ResolvableObjectReferenceData<Resources> | ObjectReferenceVariant<unknown>
}

/**
 * The resource that resource `Key` of `Resources` is found within, when its
 * entry names one (a literal `parent`), and `never` otherwise.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Key - The resource key.
 */
export type ResourceParentOf<
  Resources extends ResourceTable,
  Key extends string,
> = Key extends keyof Resources
  ? Resources[Key] extends { readonly parent: infer Parent extends string }
    ? string extends Parent
      ? never
      : Parent
    : never
  : never

/**
 * The `container` of resolvable reference data to a resource found only
 * within an object of `Parent`: required, and an identity reference to that
 * object, as data whose own container follows its resource's rule, or as a
 * reference a client bound.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Parent - The parent resource key.
 */
export interface ResolvableParentContainment<
  Resources extends ResourceTable,
  Parent extends string,
> {
  /** The parent object, which supplies the identifier the resource's `get` needs. */
  readonly container: Parent extends ResolvableResourceKey<Resources, 'one'>
    ?
        | (IdentityReferenceData<ResourceIdOf<Resources, Parent>, Parent> &
            ResolvableContainmentOf<Resources, Parent>)
        | IdentityReference<unknown, unknown, Parent>
    : never
}

/**
 * The containment rule of reference data to resource `Key`: the parent's
 * identity container ({@link ResolvableParentContainment}) when `Key` is
 * parent-scoped, and an optional resolvable container
 * ({@link ResolvableContainment}) otherwise.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Key - The resource key.
 */
export type ResolvableContainmentOf<Resources extends ResourceTable, Key extends string> = [
  ResourceParentOf<Resources, Key>,
] extends [never]
  ? ResolvableContainment<Resources>
  : ResolvableParentContainment<Resources, ResourceParentOf<Resources, Key>>

/**
 * Data of a single-object reference to `Resources` that a client can resolve:
 * the resource has `get`, and so does that of every container, at every
 * level, and a parent-scoped resource carries its parent's identity
 * container.
 *
 * @typeParam Resources - The contract's resource table type.
 */
export type ResolvableObjectReferenceData<Resources extends ResourceTable> = {
  [Key in ResolvableResourceKey<Resources, 'one'>]:
    | (IdentityReferenceData<ResourceIdOf<Resources, Key>, Key> &
        ResolvableContainmentOf<Resources, Key>)
    | (SelectorReferenceData<Key> & ResolvableContainmentOf<Resources, Key>)
}[ResolvableResourceKey<Resources, 'one'>]

/**
 * Data of a collection reference to `Resources` that a client can resolve:
 * the resource has `list`, its container (for a selector collection) has
 * `get`, and for an identity collection the resource also has `get`, through
 * which each entry resolves.
 *
 * @typeParam Resources - The contract's resource table type.
 */
export type ResolvableCollectionReferenceData<Resources extends ResourceTable> = {
  [Key in ResolvableResourceKey<Resources, 'many'>]:
    | (Key extends ResolvableResourceKey<Resources, 'one'>
        ? IdentityCollectionReferenceData<ResourceIdOf<Resources, Key>, Key> & {
            readonly entries: readonly (IdentityReferenceData<ResourceIdOf<Resources, Key>, Key> &
              ResolvableContainmentOf<Resources, Key>)[]
          }
        : never)
    | (SelectorCollectionReferenceData<Key> & ResolvableContainmentOf<Resources, Key>)
}[ResolvableResourceKey<Resources, 'many'>]

/**
 * Data of any reference to `Resources` that a client can resolve: a target,
 * containers, and entries that each record their resolving operation.
 *
 * @remarks
 * This is what `bindReference` admits for a client created from a contract
 * with this table. For a table whose keys are not known, it is every
 * {@link ReferenceData}.
 *
 * @typeParam Resources - The contract's resource table type.
 */
export type ResolvableReferenceData<Resources extends ResourceTable> =
  | ResolvableObjectReferenceData<Resources>
  | ResolvableCollectionReferenceData<Resources>

/**
 * The bound reference a client produces from reference data `Data`: the
 * variant of `Data`'s form and cardinality, to `Data`'s resource, with the
 * record and identifier types of that resource in `Resources`.
 *
 * @remarks
 * Its `resolve()` yields `Promise<Record>` for a single object and
 * `Promise<readonly Record[]>` for a collection. A union of data gives the
 * union of the bound variants.
 *
 * @typeParam Resources - The contract's resource table type.
 * @typeParam Data - The reference data being bound.
 */
export type BoundReferenceOf<
  Resources extends ResourceTable,
  Data extends ReferenceData,
> = Data extends IdentityReferenceData
  ? IdentityReference<
      ResourceRecordOf<Resources, Data['resource']>,
      ResourceIdOf<Resources, Data['resource']>,
      Data['resource']
    >
  : Data extends SelectorReferenceData
    ? SelectorReference<ResourceRecordOf<Resources, Data['resource']>, Data['resource']>
    : Data extends IdentityCollectionReferenceData
      ? IdentityCollectionReference<
          ResourceRecordOf<Resources, Data['resource']>,
          ResourceIdOf<Resources, Data['resource']>,
          Data['resource']
        >
      : Data extends SelectorCollectionReferenceData
        ? SelectorCollectionReference<
            ResourceRecordOf<Resources, Data['resource']>,
            Data['resource']
          >
        : never

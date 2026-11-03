/**
 * Generated operation descriptors and the seam between generated app contracts
 * and client factories.
 *
 * Each generated app package exports one {@link AppContract}: named SDK types,
 * one {@link OperationDescriptor} per operation, and a type-checked `bind`
 * function that turns a {@link ClientRuntime} into the app's client. Client
 * factories (local or remote) supply the runtime; the contract is the same in
 * both, which is what lets application code switch locality by changing only
 * the factory.
 *
 * Descriptors are platform-neutral data. The manifest, which only the Mac-side
 * runtime needs, is loaded lazily, so a remote client never loads it.
 *
 * @packageDocumentation
 */

import type { CallOptions } from '../call-options.js'
import type { ReferenceData } from '../references/index.js'
import type { ValueType } from '../values/value-type.js'
import type { ClientBrand, ResourceTable } from './resource-table.js'

export type {
  BoundReferenceOf,
  ClientBrand,
  ResolvableCollectionReferenceData,
  ResolvableContainment,
  ResolvableObjectReferenceData,
  ResolvableReferenceData,
  ResolvableResourceKey,
  ResourceIdOf,
  ResourceRecordOf,
  ResourceTable,
} from './resource-table.js'

/**
 * Stable identity of an operation: `app.resource.command` (or `app.app.command`
 * for app-level commands), keyed by the manifest command key. It is the RPC
 * route segment and the basis of MCP tool names.
 */
export type OperationId = `${string}.${string}.${string}`

/** A fine-grained capability permission: `app:resource:operation`. */
export type PermissionString = `${string}:${string}:${string}`

/** Where in the app manifest an operation's command lives. */
export interface OperationTarget {
  /** The manifest command key. */
  readonly command: string
  /** The manifest resource key, for resource-scoped commands. */
  readonly resource?: string
}

/**
 * Everything a client or runtime needs to know about one operation.
 *
 * @remarks
 * `permission` must equal the permission the manifest derives for the command.
 * The runtime checks this when an app is registered and refuses a mismatch, so a
 * stale or altered package cannot widen authority.
 *
 * @typeParam Input - The SDK input record.
 * @typeParam Output - The SDK result.
 */
export interface OperationDescriptor<Input, Output> {
  /** Stable operation identity and route. */
  readonly id: OperationId
  /** The permission the operation requires. */
  readonly permission: PermissionString
  /** The manifest command the operation executes. */
  readonly target: OperationTarget
  /** What the operation does, for documentation and tool descriptions. */
  readonly description: string
  /** Contract of the input record. */
  readonly input: ValueType<Input>
  /** Contract of the result. */
  readonly output: ValueType<Output>
  /**
   * The draft-7 JSON Schema of the input's wire values: exactly
   * `z.toJSONSchema(input.wire, { target: 'draft-7' })`, computed when the
   * contract is generated.
   *
   * @remarks
   * It describes WIRE values, not SDK values, and is always present on
   * generated descriptors. It exists so tooling can read an operation's input
   * schema as plain data, without zod. Adapters never read or serve it: they
   * always derive their schemas from `input.wire`, which stays the single
   * source of truth (phases/13 D9).
   */
  readonly inputJsonSchema?: Readonly<Record<string, unknown>>
  /**
   * Present when the operation cannot be called: a required position of its
   * input admits no value.
   *
   * @remarks
   * The descriptor stays in the contract, so the operation keeps its identity
   * and its input still rejects every request. The surfaces that offer
   * operations (MCP tools, HTTP routes, the methods of the generated clients,
   * CLI commands, capability discovery) leave an unavailable operation out, so
   * they never offer a call that must fail, and the runtime answers a call to
   * it exactly as one to an unknown operation.
   */
  readonly unavailable?: OperationUnavailability
}

/**
 * Why an operation cannot be called.
 *
 * @remarks
 * Each listed position takes a reference to a resource the app has no
 * operation to resolve, so its value type accepts no reference
 * (phases/13 D7, "Resolvable targets"). An optional position like that is
 * left out of the input instead; only a required one makes the operation
 * unavailable.
 */
export interface OperationUnavailability {
  /** The input fields that admit no value, by request field name, in input order. */
  readonly positions: readonly string[]
  /** Why, in words for the operation's documentation. */
  readonly reason: string
}

/** A descriptor whose input and output types are not statically known. */
export type AnyOperationDescriptor = OperationDescriptor<unknown, unknown>

/**
 * What a client needs to encode, decode, and hydrate references to one
 * resource.
 *
 * @typeParam RecordType - The resource's SDK record.
 * @typeParam Id - The SDK type of the resource's identifier.
 */
export interface ResourceDescriptor<RecordType, Id = unknown> {
  /** The manifest resource key. */
  readonly name: string
  /** Contract of the resource's record. */
  readonly record: ValueType<RecordType>
  /**
   * Contract of the resource's identifier: it encodes and decodes the `id` of
   * every identity reference to this resource, including references that
   * appear as another reference's container.
   *
   * @remarks
   * Absent when the resource has no identifier. Such a resource can be
   * referenced only by selector forms (name, index, every, or range); an
   * identity reference to it is rejected when encoding and decoding.
   *
   * When the identifier is the object's name (a name-keyed resource),
   * resolving an identity reference has the meaning of a name selector: it
   * resolves to whatever object has that name when it is resolved. Which
   * object that is when several share the name is defined by the app, so
   * such a reference does not pin one particular object.
   */
  readonly id?: ValueType<Id>
  /** Operation that reads one object, used to resolve single references. */
  readonly get?: OperationId
  /** Operation that lists objects, used to resolve collection references. */
  readonly list?: OperationId
}

/**
 * The capability a client factory hands to a generated contract.
 *
 * @remarks
 * Local and remote factories each implement this, and references a client
 * decodes are bound to it. Both members run under the client's credential and
 * throw canonical structured errors on failure:
 *
 * - `invoke` encodes the input, runs the operation, and decodes the result;
 * - `resolve` encodes a reference, resolves it where the client's operations
 *   run, and decodes the result.
 */
export interface ClientRuntime {
  /** Run one operation and return its SDK result. */
  invoke<Input, Output>(
    operation: OperationDescriptor<Input, Output>,
    input: Input,
    options?: CallOptions
  ): Promise<Output>
  /**
   * Resolve one reference of the client's app and return its SDK result.
   *
   * @remarks
   * The reference is re-encoded from its data fields through the app's
   * reference value type, so what is sent is always the canonical wire form
   * (phases/13 D7). A reference that fails encoding, including one whose `app`
   * is not the client's app at any level, raises `ValidationError` before
   * anything is sent.
   *
   * The reference resolves as the operation its resource records for its
   * cardinality (`get` for a single object, `list` for a collection; see
   * `resolvingOperationKey`), under that operation's permission and policy,
   * and the result is decoded with that operation's output contract: the
   * record for a single reference, an array of records (possibly empty) for a
   * collection. A result that violates the contract raises
   * `UnexpectedValueError`, and references inside the result are bound to the
   * same client.
   *
   * @param reference - The reference's data: a bound reference or one built by
   *   hand.
   * @param options - Per-call options, such as an abort signal.
   * @returns The resolved SDK value.
   */
  resolve(reference: ReferenceData, options?: CallOptions): Promise<unknown>
}

/**
 * One app's generated contract.
 *
 * @typeParam Client - The app's generated client interface.
 * @typeParam Resources - The type of the contract's resource table. A
 *   generated contract declares its table's literal type, so that a client
 *   created from it can check references statically (see
 *   {@link ResolvableReferenceData}). It defaults to the widest table, whose
 *   keys are not known.
 */
export interface AppContract<Client, Resources extends ResourceTable = ResourceTable> {
  /** The app's route segment, for example `'calendar'`. */
  readonly app: string
  /** Every operation, keyed by identity. */
  readonly operations: Readonly<Record<OperationId, AnyOperationDescriptor>>
  /**
   * Every resource that references can point to, keyed by manifest resource
   * key.
   *
   * @remarks
   * This table is the app's reference registry: it is assignable to
   * {@link ReferenceRegistry}. The contract itself is assignable to
   * {@link ReferenceScope}, and reference value types read the app and its
   * identifier types from it through a lazy thunk, so generated code builds
   * no parallel table.
   */
  readonly resources: Resources
  /**
   * Load the app manifest. Called only by the Mac-side runtime, which validates
   * the result before use.
   */
  loadManifest(): Promise<unknown>
  /**
   * Build the app client on top of a factory-supplied runtime.
   *
   * @remarks
   * The result's type carries the contract's resource table in a
   * {@link ClientBrand}, which has no runtime presence: `bind` returns the
   * client alone.
   */
  bind(runtime: ClientRuntime): Client & ClientBrand<Resources>
}

/**
 * The shape shared by the local and remote client factories: an app contract
 * plus locality-specific options yields that app's client, whose type carries
 * the contract's resource table.
 */
export type ClientFactory<Options> = <Client, Resources extends ResourceTable>(
  app: AppContract<Client, Resources>,
  options: Options
) => Client & ClientBrand<Resources>

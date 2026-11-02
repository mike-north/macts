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
import type { ValueType } from '../values/value-type.js'

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
 * Local and remote factories each implement this. `invoke` encodes the input,
 * runs the operation under the client's credential, and decodes the result,
 * throwing canonical structured errors on failure.
 */
export interface ClientRuntime {
  /** Run one operation and return its SDK result. */
  invoke<Input, Output>(
    operation: OperationDescriptor<Input, Output>,
    input: Input,
    options?: CallOptions
  ): Promise<Output>
}

/**
 * One app's generated contract.
 *
 * @typeParam Client - The app's generated client interface.
 */
export interface AppContract<Client> {
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
   * {@link ReferenceRegistry}, and reference value types read identifier
   * types from it (through a lazy thunk), so generated code builds no
   * parallel table.
   */
  readonly resources: Readonly<Record<string, ResourceDescriptor<unknown>>>
  /**
   * Load the app manifest. Called only by the Mac-side runtime, which validates
   * the result before use.
   */
  loadManifest(): Promise<unknown>
  /** Build the app client on top of a factory-supplied runtime. */
  bind(runtime: ClientRuntime): Client
}

/**
 * The shape shared by the local and remote client factories: an app contract
 * plus locality-specific options yields that app's client.
 */
export type ClientFactory<Options> = <Client>(app: AppContract<Client>, options: Options) => Client

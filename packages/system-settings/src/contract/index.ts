/**
 * The System Settings contract: the transport-neutral description of every
 * System Settings operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `SystemSettingsClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `SystemSettingsClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the System Settings manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/** A settings pane. */
export interface Pane {
  /**
   * The id of the settings pane.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the settings pane.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** An anchor within a settings pane. */
export interface Anchor {
  /**
   * The name of the anchor.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** Input for creating a Pane. */
export type PaneCreateInput = Record<string, never>

/** Input for updating a Pane. Omitted fields are left unchanged. */
export type PaneUpdateInput = Record<string, never>

/** Input for creating an Anchor. */
export type AnchorCreateInput = Record<string, never>

/** Input for updating an Anchor. Omitted fields are left unchanged. */
export type AnchorUpdateInput = Record<string, never>

/**
 * The System Settings client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link systemSettingsContract}. Its type carries the
 * contract's resource table, {@link SystemSettingsResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface SystemSettingsClient extends ClientBrand<SystemSettingsResources> {
  /** Reveals a settings pane or an anchor within a pane. */
  reveal(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link systemSettingsContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type SystemSettingsResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link SystemSettingsResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies SystemSettingsResources

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-settings.app.reveal',
  permission: 'system-settings:app:reveal',
  target: { command: 'reveal' },
  description: 'Reveals a settings pane or an anchor within a pane.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SystemSettingsClient>['operations'] = {
  'system-settings.app.reveal': appRevealOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SystemSettingsClient {
  return {
    reveal: (options) => runtime.invoke(appRevealOperation, {}, options),
  }
}

/**
 * The System Settings contract. Pass it to a client factory to obtain a
 * {@link SystemSettingsClient}.
 */
export const systemSettingsContract: AppContract<SystemSettingsClient, SystemSettingsResources> = {
  app: 'system-settings',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

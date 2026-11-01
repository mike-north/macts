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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `SystemSettingsClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { systemSettingsContract } from '@macts/system-settings/contract'
 *
 * const client = createClient(systemSettingsContract, { token, url })
 * ```
 *
 * Generated from the System Settings manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A settings pane. */
export interface Pane {
  /** The id of the settings pane. */
  readonly id: string
  /** The name of the settings pane. */
  readonly name: string
}

/** An anchor within a settings pane. */
export interface Anchor {
  /** The name of the anchor. */
  readonly name: string
}

/** Input for creating a Pane. */
export type PaneCreateInput = Record<string, never>

/** Input for updating a Pane. Omitted fields are left unchanged. */
export type PaneUpdateInput = Record<string, never>

/** Input for creating an Anchor. */
export type AnchorCreateInput = Record<string, never>

/** Input for updating an Anchor. Omitted fields are left unchanged. */
export type AnchorUpdateInput = Record<string, never>

/** A settings pane. */
export interface PaneResourceClient {
  /** Prompt for authorization for a settings pane. Deprecated: no longer does anything. */
  authorize(options?: CallOptions): Promise<void>
  /**
   * Times and loads given settings pane and returns load time. Deprecated: no longer does anything.
   */
  timedLoad(options?: CallOptions): Promise<void>
}

/**
 * The System Settings client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link systemSettingsContract}.
 */
export interface SystemSettingsClient {
  /** A settings pane. */
  readonly panes: PaneResourceClient
  /** Reveals a settings pane or an anchor within a pane. */
  reveal(options?: CallOptions): Promise<void>
}

const paneRecordType: ValueType<Pane> = t.record(
  {
    id: t.string({ description: 'The id of the settings pane.' }),
    name: t.string({ description: 'The name of the settings pane.' }),
  },
  { description: 'A settings pane.' }
)

const anchorRecordType: ValueType<Anchor> = t.record(
  {
    name: t.string({ description: 'The name of the anchor.' }),
  },
  { description: 'An anchor within a settings pane.' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<SystemSettingsClient>['resources'] = {
  Pane: {
    name: 'Pane',
    record: paneRecordType,
    id: t.string({ description: 'The id of the settings pane.' }),
  },
  Anchor: {
    name: 'Anchor',
    record: anchorRecordType,
  },
}

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-settings.app.reveal',
  permission: 'system-settings:app:reveal',
  target: { command: 'reveal' },
  description: 'Reveals a settings pane or an anchor within a pane.',
  input: t.record({}),
  output: t.none(),
}

const paneAuthorizeOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-settings.panes.authorize',
  permission: 'system-settings:panes:authorize',
  target: { command: 'authorize', resource: 'Pane' },
  description: 'Prompt for authorization for a settings pane. Deprecated: no longer does anything.',
  input: t.record({}),
  output: t.none(),
}

const paneTimedLoadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-settings.panes.timedLoad',
  permission: 'system-settings:panes:timedLoad',
  target: { command: 'timedLoad', resource: 'Pane' },
  description:
    'Times and loads given settings pane and returns load time. Deprecated: no longer does anything.',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SystemSettingsClient>['operations'] = {
  'system-settings.app.reveal': appRevealOperation,
  'system-settings.panes.authorize': paneAuthorizeOperation,
  'system-settings.panes.timedLoad': paneTimedLoadOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SystemSettingsClient {
  return {
    panes: {
      authorize: (options) => runtime.invoke(paneAuthorizeOperation, {}, options),
      timedLoad: (options) => runtime.invoke(paneTimedLoadOperation, {}, options),
    },
    reveal: (options) => runtime.invoke(appRevealOperation, {}, options),
  }
}

/**
 * The System Settings contract. Pass it to a client factory to obtain a
 * {@link SystemSettingsClient}.
 */
export const systemSettingsContract: AppContract<SystemSettingsClient> = {
  app: 'system-settings',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

/**
 * The Screen Sharing contract: the transport-neutral description of every
 * Screen Sharing operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ScreenSharingClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ScreenSharingClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Screen Sharing manifest; do not edit.
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

/** A screen sharing connection */
export interface Connection {
  /**
   * The connection name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the connection.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The VNC URL of the connection.
   * Nullable. No evidence that the app always sets it.
   */
  readonly url: string | null
}

/** Input for creating a Connection. */
export type ConnectionCreateInput = Record<string, never>

/** Input for updating a Connection. Omitted fields are left unchanged. */
export type ConnectionUpdateInput = Record<string, never>

/** A screen sharing connection */
export interface ConnectionResourceClient {
  /** List connections. */
  list(options?: CallOptions): Promise<readonly Connection[]>
  /**
   * Read the connection identified by `id`.
   *
   * @param id - Connection identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Connection>
}

/**
 * The Screen Sharing client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link screenSharingContract}.
 */
export interface ScreenSharingClient {
  /** A screen sharing connection */
  readonly connections: ConnectionResourceClient
  /**
   * Open a vnc URL
   *
   * @param url - The VNC URL to open. Does not accept null.
   */
  getURL(url: string, options?: CallOptions): Promise<void>
}

const connectionRecordType: ValueType<Connection> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The connection name' }),
    id: t.string({ description: 'The unique identifier of the connection' }),
    url: t.nullable(t.string(), { description: 'The VNC URL of the connection' }),
  },
  { description: 'A screen sharing connection' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ScreenSharingClient>['resources'] = {
  Connection: {
    name: 'Connection',
    record: connectionRecordType,
    id: t.string({ description: 'The unique identifier of the connection' }),
    get: 'screen-sharing.connections.get',
    list: 'screen-sharing.connections.list',
  },
}

const connectionListOperation: OperationDescriptor<Record<string, never>, readonly Connection[]> = {
  id: 'screen-sharing.connections.list',
  permission: 'screen-sharing:connections:list',
  target: { command: 'list', resource: 'Connection' },
  description: 'List all screen sharing connections',
  input: t.record({}),
  output: t.array(connectionRecordType),
}

const connectionGetOperation: OperationDescriptor<{ readonly id: string }, Connection> = {
  id: 'screen-sharing.connections.get',
  permission: 'screen-sharing:connections:get',
  target: { command: 'get', resource: 'Connection' },
  description: 'Get a connection by ID',
  input: t.record({
    id: t.string({ description: 'Connection identifier' }),
  }),
  output: connectionRecordType,
}

const appGetURLOperation: OperationDescriptor<{ readonly url: string }, undefined> = {
  id: 'screen-sharing.app.getURL',
  permission: 'screen-sharing:app:getURL',
  target: { command: 'getURL' },
  description: 'Open a vnc URL',
  input: t.record({
    url: t.string({ description: 'The VNC URL to open' }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ScreenSharingClient>['operations'] = {
  'screen-sharing.connections.list': connectionListOperation,
  'screen-sharing.connections.get': connectionGetOperation,
  'screen-sharing.app.getURL': appGetURLOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ScreenSharingClient {
  return {
    connections: {
      list: (options) => runtime.invoke(connectionListOperation, {}, options),
      get: (id, options) => runtime.invoke(connectionGetOperation, { id }, options),
    },
    getURL: (url, options) => runtime.invoke(appGetURLOperation, { url }, options),
  }
}

/**
 * The Screen Sharing contract. Pass it to a client factory to obtain a
 * {@link ScreenSharingClient}.
 */
export const screenSharingContract: AppContract<ScreenSharingClient> = {
  app: 'screen-sharing',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

/**
 * The Console contract: the transport-neutral description of every
 * Console operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ConsoleClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ConsoleClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Console manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/**
 * The Console client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link consoleContract}.
 */
export interface ConsoleClient {
  /** Select a device. */
  selectDevice(options?: CallOptions): Promise<void>
}

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ConsoleClient>['resources'] = {}

const appSelectDeviceOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'console.app.selectDevice',
  permission: 'console:app:selectDevice',
  target: { command: 'selectDevice' },
  description: 'Select a device.',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ConsoleClient>['operations'] = {
  'console.app.selectDevice': appSelectDeviceOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ConsoleClient {
  return {
    selectDevice: (options) => runtime.invoke(appSelectDeviceOperation, {}, options),
  }
}

/**
 * The Console contract. Pass it to a client factory to obtain a
 * {@link ConsoleClient}.
 */
export const consoleContract: AppContract<ConsoleClient> = {
  app: 'console',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

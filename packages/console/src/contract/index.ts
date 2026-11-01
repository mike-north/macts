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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `ConsoleClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { consoleContract } from '@macts/console/contract'
 *
 * const client = createClient(consoleContract, { token, url })
 * ```
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
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A device in Console */
export interface Device {
  /** The device name */
  readonly name: string
  /** The unique identifier of the device */
  readonly id: string
}

/** Input for creating a Device. */
export type DeviceCreateInput = Record<string, never>

/** Input for updating a Device. Omitted fields are left unchanged. */
export type DeviceUpdateInput = Record<string, never>

/**
 * The Console client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link consoleContract}.
 */
export interface ConsoleClient {
  /** Select a device. */
  selectDevice(options?: CallOptions): Promise<void>
}

const deviceRecordType: ValueType<Device> = t.record(
  {
    name: t.string({ description: 'The device name' }),
    id: t.string({ description: 'The unique identifier of the device' }),
  },
  { description: 'A device in Console' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ConsoleClient>['resources'] = {
  Device: {
    name: 'Device',
    record: deviceRecordType,
    id: t.string({ description: 'The unique identifier of the device' }),
  },
}

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

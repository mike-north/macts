/**
 * The Bluetooth File Exchange contract: the transport-neutral description of every
 * Bluetooth File Exchange operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `BluetoothFileExchangeClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `BluetoothFileExchangeClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { bluetoothFileExchangeContract } from '@macts/bluetooth-file-exchange/contract'
 *
 * const client = createClient(bluetoothFileExchangeContract, { token, url })
 * ```
 *
 * Generated from the Bluetooth File Exchange manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileSource,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** The Bluetooth File Exchange application */
export interface Application {
  /** The name of the application */
  readonly name: string
}

/** Input for creating an Application. */
export type ApplicationCreateInput = Record<string, never>

/** Input for updating an Application. Omitted fields are left unchanged. */
export type ApplicationUpdateInput = Record<string, never>

/**
 * The Bluetooth File Exchange client: one namespace per resource that has operations, plus the
 * app's own commands. A client factory creates one from {@link bluetoothFileExchangeContract}.
 */
export interface BluetoothFileExchangeClient {
  /** Browse a device */
  browse(device?: string, options?: CallOptions): Promise<void>
  /** Send a file to a bluetooth device */
  send(file?: readonly FileSource[], toDevice?: string, options?: CallOptions): Promise<void>
}

const applicationRecordType: ValueType<Application> = t.record(
  {
    name: t.string({ description: 'The name of the application' }),
  },
  { description: 'The Bluetooth File Exchange application' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<BluetoothFileExchangeClient>['resources'] = {
  Application: {
    name: 'Application',
    record: applicationRecordType,
    id: t.string({ description: 'The name of the application' }),
  },
}

const appBrowseOperation: OperationDescriptor<{ readonly device?: string | undefined }, undefined> =
  {
    id: 'bluetooth-file-exchange.app.browse',
    permission: 'bluetooth-file-exchange:app:browse',
    target: { command: 'browse' },
    description: 'Browse a device',
    input: t.record({
      device: t.optional(t.string({ description: 'The device to browse' })),
    }),
    output: t.none(),
  }

const appSendOperation: OperationDescriptor<
  { readonly file?: readonly FileSource[] | undefined; readonly toDevice?: string | undefined },
  undefined
> = {
  id: 'bluetooth-file-exchange.app.send',
  permission: 'bluetooth-file-exchange:app:send',
  target: { command: 'send' },
  description: 'Send a file to a bluetooth device',
  input: t.record({
    file: t.optional(t.array(t.fileSource(), { description: 'The file(s) to send' })),
    toDevice: t.optional(t.string({ description: 'The device to send the file to' })),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<BluetoothFileExchangeClient>['operations'] = {
  'bluetooth-file-exchange.app.browse': appBrowseOperation,
  'bluetooth-file-exchange.app.send': appSendOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): BluetoothFileExchangeClient {
  return {
    browse: (device, options) => runtime.invoke(appBrowseOperation, { device }, options),
    send: (file, toDevice, options) =>
      runtime.invoke(appSendOperation, { file, toDevice }, options),
  }
}

/**
 * The Bluetooth File Exchange contract. Pass it to a client factory to obtain a
 * {@link BluetoothFileExchangeClient}.
 */
export const bluetoothFileExchangeContract: AppContract<BluetoothFileExchangeClient> = {
  app: 'bluetooth-file-exchange',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

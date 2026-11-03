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
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `BluetoothFileExchangeClient`; application code changes locality by
 * changing the factory, not the contract.
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
} from '@macts/contracts'

const t = ValueTypes

/** The Bluetooth File Exchange application */
export interface Application {
  /**
   * The name of the application.
   * Never null: the primary identifier.
   */
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
  /**
   * Browse a device
   *
   * @param device - The device to browse. Does not accept null.
   */
  browse(device?: string, options?: CallOptions): Promise<void>
  /**
   * Send a file to a bluetooth device
   *
   * @param file - The file(s) to send. Does not accept null.
   * @param toDevice - The device to send the file to. Does not accept null.
   */
  send(file?: readonly FileSource[], toDevice?: string, options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link bluetoothFileExchangeContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type BluetoothFileExchangeResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link BluetoothFileExchangeResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies BluetoothFileExchangeResources

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
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { device: { type: 'string', description: 'The device to browse' } },
      additionalProperties: false,
    },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      file: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fileSource: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', const: 'caller-owned-file' },
                    path: { type: 'string', minLength: 1 },
                  },
                  required: ['kind', 'path'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', const: 'uploaded-file' },
                    uploadId: { type: 'string', minLength: 1 },
                  },
                  required: ['kind', 'uploadId'],
                  additionalProperties: false,
                },
              ],
            },
          },
          required: ['fileSource'],
          additionalProperties: false,
        },
        description: 'The file(s) to send',
      },
      toDevice: { type: 'string', description: 'The device to send the file to' },
    },
    additionalProperties: false,
  },
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
export const bluetoothFileExchangeContract: AppContract<
  BluetoothFileExchangeClient,
  BluetoothFileExchangeResources
> = {
  app: 'bluetooth-file-exchange',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

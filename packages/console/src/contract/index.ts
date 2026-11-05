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
  type ClientBrand,
  type ClientRuntime,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/**
 * The Console client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from `consoleContract` in the app's `/contract` entry. Its type
 * carries the contract's resource table, {@link ConsoleResources}, so references can be bound to it
 * by resource; the brand has no runtime member.
 */
export interface ConsoleClient extends ClientBrand<ConsoleResources> {
  /** Select a device. */
  selectDevice(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table in `consoleContract` (the app's `/contract` entry): every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type ConsoleResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link ConsoleResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies ConsoleResources

const appSelectDeviceOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'console.app.selectDevice',
  permission: 'console:app:selectDevice',
  target: { command: 'selectDevice' },
  description: 'Select a device.',
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
export const consoleContract: AppContract<ConsoleClient, ConsoleResources> = {
  app: 'console',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

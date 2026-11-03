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
  type ClientBrand,
  type ClientRuntime,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/**
 * The Screen Sharing client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link screenSharingContract}. Its type carries the
 * contract's resource table, {@link ScreenSharingResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface ScreenSharingClient extends ClientBrand<ScreenSharingResources> {
  /**
   * Open a vnc URL
   *
   * @param url - The VNC URL to open. Does not accept null.
   */
  getURL(url: string, options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link screenSharingContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type ScreenSharingResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link ScreenSharingResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies ScreenSharingResources

const appGetURLOperation: OperationDescriptor<{ readonly url: string }, undefined> = {
  id: 'screen-sharing.app.getURL',
  permission: 'screen-sharing:app:getURL',
  target: { command: 'getURL' },
  description: 'Open a vnc URL',
  input: t.record({
    url: t.string({ description: 'The VNC URL to open' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { url: { type: 'string', description: 'The VNC URL to open' } },
    required: ['url'],
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ScreenSharingClient>['operations'] = {
  'screen-sharing.app.getURL': appGetURLOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ScreenSharingClient {
  return {
    getURL: (url, options) => runtime.invoke(appGetURLOperation, { url }, options),
  }
}

/**
 * The Screen Sharing contract. Pass it to a client factory to obtain a
 * {@link ScreenSharingClient}.
 */
export const screenSharingContract: AppContract<ScreenSharingClient, ScreenSharingResources> = {
  app: 'screen-sharing',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

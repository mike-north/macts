/**
 * The Messages contract: the transport-neutral description of every
 * Messages operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `MessagesClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `MessagesClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Messages manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type ObjectReferenceVariant,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/** ServiceType */
export type ServiceType = 'sMS' | 'iMessage' | 'rCS'

/** Direction */
export type Direction = 'incoming' | 'outgoing'

/** TransferStatus */
export type TransferStatus =
  | 'preparing'
  | 'waiting'
  | 'transferring'
  | 'finalizing'
  | 'finished'
  | 'failed'

/** ConnectionStatus */
export type ConnectionStatus = 'disconnecting' | 'connected' | 'connecting' | 'disconnected'

/** A participant for an account. */
export interface Participant {
  /**
   * The participant's unique identifier. For example:
   * 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The account for this participant.
   * Nullable. No evidence that the app always sets it.
   */
  readonly account: ObjectReferenceVariant<Account, string, 'Account'> | null
  /**
   * The participant's name as it appears in the participant list.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The participant's handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly handle: string | null
  /**
   * The first name from this participan's Contacts card, if available.
   * Nullable. No evidence that the app always sets it.
   */
  readonly firstName: string | null
  /**
   * The last name from this participant's Contacts card, if available.
   * Nullable. No evidence that the app always sets it.
   */
  readonly lastName: string | null
  /**
   * The full name from this participant's Contacts card, if available.
   * Nullable. No evidence that the app always sets it.
   */
  readonly fullName: string | null
}

/** An account that can be logged in to from this system */
export interface Account {
  /**
   * A unique identifier for this account.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of this account as defined in Account preferences description field.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the account enabled?
   * Nullable. No evidence that the app always sets it.
   */
  enabled: boolean | null
  /**
   * The connection status for this account.
   * Nullable. No evidence that the app always sets it.
   */
  readonly connectionStatus: string | null
  /**
   * The type of service for this account.
   * Nullable. No evidence that the app always sets it.
   */
  readonly serviceType: string | null
}

/** An SMS or iMessage chat. */
export interface Chat {
  /**
   * A guid identifier for this chat.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The chat's name as it appears in the chat list.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The account which is participating in this chat.
   * Nullable. No evidence that the app always sets it.
   */
  readonly account: ObjectReferenceVariant<Account, string, 'Account'> | null
}

/** Input for creating a Participant. */
export type ParticipantCreateInput = Record<string, never>

/** Input for updating a Participant. Omitted fields are left unchanged. */
export type ParticipantUpdateInput = Record<string, never>

/** Input for creating an Account. */
export interface AccountCreateInput {
  /** Is the account enabled? */
  enabled?: boolean
}

/** Input for updating an Account. Omitted fields are left unchanged. */
export interface AccountUpdateInput {
  /**
   * Is the account enabled?
   * Cannot be reset: null is rejected.
   */
  enabled?: boolean
}

/** Input for creating a Chat. */
export type ChatCreateInput = Record<string, never>

/** Input for updating a Chat. Omitted fields are left unchanged. */
export type ChatUpdateInput = Record<string, never>

/**
 * The Messages client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link messagesContract}.
 */
export interface MessagesClient {
  /**
   * Sends a message to a participant or to a chat.
   *
   * @param to - The to parameter. Does not accept null.
   */
  send(to: string, options?: CallOptions): Promise<void>
  /** Login to all accounts. */
  login(options?: CallOptions): Promise<void>
  /** Logout of all accounts. */
  logout(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link messagesContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type MessagesResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link MessagesResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies MessagesResources

const appSendOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'messages.app.send',
  permission: 'messages:app:send',
  target: { command: 'send' },
  description: 'Sends a message to a participant or to a chat.',
  input: t.record({
    to: t.string({ description: 'The to parameter' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'The to parameter' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appLoginOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'messages.app.login',
  permission: 'messages:app:login',
  target: { command: 'login' },
  description: 'Login to all accounts.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appLogoutOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'messages.app.logout',
  permission: 'messages:app:logout',
  target: { command: 'logout' },
  description: 'Logout of all accounts.',
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
const operations: AppContract<MessagesClient>['operations'] = {
  'messages.app.send': appSendOperation,
  'messages.app.login': appLoginOperation,
  'messages.app.logout': appLogoutOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): MessagesClient {
  return {
    send: (to, options) => runtime.invoke(appSendOperation, { to }, options),
    login: (options) => runtime.invoke(appLoginOperation, {}, options),
    logout: (options) => runtime.invoke(appLogoutOperation, {}, options),
  }
}

/**
 * The Messages contract. Pass it to a client factory to obtain a
 * {@link MessagesClient}.
 */
export const messagesContract: AppContract<MessagesClient, MessagesResources> = {
  app: 'messages',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

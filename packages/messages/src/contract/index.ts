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
  type ValueType,
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
   * 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890
   */
  readonly id: string
  /** The account for this participant. */
  readonly account: ObjectReferenceVariant<Account, string>
  /** The participant's name as it appears in the participant list. */
  readonly name: string
  /** The participant's handle. */
  readonly handle: string
  /** The first name from this participan's Contacts card, if available */
  readonly firstName: string
  /** The last name from this participant's Contacts card, if available */
  readonly lastName: string
  /** The full name from this participant's Contacts card, if available */
  readonly fullName: string
}

/** An account that can be logged in to from this system */
export interface Account {
  /** A unique identifier for this account. */
  readonly id: string
  /** The name of this account as defined in Account preferences description field */
  readonly description: string
  /** Is the account enabled? */
  enabled: boolean
  /** The connection status for this account. */
  readonly connectionStatus: string
  /** The type of service for this account */
  readonly serviceType: string
}

/** An SMS or iMessage chat. */
export interface Chat {
  /** A guid identifier for this chat. */
  readonly id: string
  /** The chat's name as it appears in the chat list. */
  readonly name: string
  /** The account which is participating in this chat. */
  readonly account: ObjectReferenceVariant<Account, string>
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
  /** Is the account enabled? */
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
  /** Sends a message to a participant or to a chat. */
  send(to: string, options?: CallOptions): Promise<void>
  /** Login to all accounts. */
  login(options?: CallOptions): Promise<void>
  /** Logout of all accounts. */
  logout(options?: CallOptions): Promise<void>
}

const participantRecordType: ValueType<Participant> = t.record(
  {
    id: t.string({
      description:
        "The participant's unique identifier. For example: 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890",
    }),
    account: t.reference<Account, string>(() => resources, 'Account', 'one', {
      description: 'The account for this participant.',
    }),
    name: t.string({
      description: "The participant's name as it appears in the participant list.",
    }),
    handle: t.string({ description: "The participant's handle." }),
    firstName: t.string({
      description: "The first name from this participan's Contacts card, if available",
    }),
    lastName: t.string({
      description: "The last name from this participant's Contacts card, if available",
    }),
    fullName: t.string({
      description: "The full name from this participant's Contacts card, if available",
    }),
  },
  { description: 'A participant for an account.' }
)

const accountRecordType: ValueType<Account> = t.record(
  {
    id: t.string({ description: 'A unique identifier for this account.' }),
    description: t.string({
      description: 'The name of this account as defined in Account preferences description field',
    }),
    enabled: t.boolean({ description: 'Is the account enabled?' }),
    connectionStatus: t.string({ description: 'The connection status for this account.' }),
    serviceType: t.string({ description: 'The type of service for this account' }),
  },
  { description: 'An account that can be logged in to from this system' }
)

const chatRecordType: ValueType<Chat> = t.record(
  {
    id: t.string({ description: 'A guid identifier for this chat.' }),
    name: t.string({ description: "The chat's name as it appears in the chat list." }),
    account: t.reference<Account, string>(() => resources, 'Account', 'one', {
      description: 'The account which is participating in this chat.',
    }),
  },
  { description: 'An SMS or iMessage chat.' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<MessagesClient>['resources'] = {
  Participant: {
    name: 'Participant',
    record: participantRecordType,
    id: t.string({
      description:
        "The participant's unique identifier. For example: 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890",
    }),
  },
  Account: {
    name: 'Account',
    record: accountRecordType,
    id: t.string({ description: 'A unique identifier for this account.' }),
  },
  Chat: {
    name: 'Chat',
    record: chatRecordType,
    id: t.string({ description: 'A guid identifier for this chat.' }),
  },
}

const appSendOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'messages.app.send',
  permission: 'messages:app:send',
  target: { command: 'send' },
  description: 'Sends a message to a participant or to a chat.',
  input: t.record({
    to: t.string({ description: 'The to parameter' }),
  }),
  output: t.none(),
}

const appLoginOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'messages.app.login',
  permission: 'messages:app:login',
  target: { command: 'login' },
  description: 'Login to all accounts.',
  input: t.record({}),
  output: t.none(),
}

const appLogoutOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'messages.app.logout',
  permission: 'messages:app:logout',
  target: { command: 'logout' },
  description: 'Logout of all accounts.',
  input: t.record({}),
  output: t.none(),
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
export const messagesContract: AppContract<MessagesClient> = {
  app: 'messages',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

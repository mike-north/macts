/**
 * The Reminders contract: the transport-neutral description of every
 * Reminders operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `RemindersClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `RemindersClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { remindersContract } from '@macts/reminders/contract'
 *
 * const client = createClient(remindersContract, { token, url })
 * ```
 *
 * Generated from the Reminders manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** Priority level for reminders */
export type ReminderPriority = '0' | '9' | '5' | '1'

/** An account in the Reminders application */
export interface Account {
  /** The name of the account */
  readonly name: string
  /** The unique identifier of the account */
  readonly id: string
}

/** A list of reminders */
export interface List {
  /** The name of the list */
  name: string
  /** The unique identifier of the list */
  readonly id: string
  /** The color of the list */
  color: Rgb
  /** The emblem icon name of the list */
  emblem: string
}

/** A reminder item */
export interface Reminder {
  /** The name of the reminder */
  name: string
  /** The unique identifier of the reminder */
  readonly id: string
  /** The notes attached to the reminder */
  body: string
  /** Whether the reminder is completed */
  completed: boolean
  /** The completion date of the reminder */
  readonly completionDate: Date
  /** The due date of the reminder */
  dueDate: Date
  /** The remind date of the reminder */
  remindMeDate: Date
  /** The priority of the reminder (0=none, 1=high, 5=medium, 9=low) */
  priority: Integer
  /** Whether the reminder is flagged */
  flagged: boolean
  /** The creation date of the reminder */
  readonly creationDate: Date
  /** The modification date of the reminder */
  readonly modificationDate: Date
  /** The all-day due date of the reminder */
  allDayDueDate: Date
}

/** Input for creating an Account. */
export type AccountCreateInput = Record<string, never>

/** Input for updating an Account. Omitted fields are left unchanged. */
export type AccountUpdateInput = Record<string, never>

/** Input for creating a List. */
export interface ListCreateInput {
  /** List name */
  name: string
  /** List color */
  color?: Rgb
  /** The emblem icon name of the list */
  emblem?: string
}

/** Input for updating a List. Omitted fields are left unchanged. */
export interface ListUpdateInput {
  /** List name */
  name?: string
  /** List color */
  color?: Rgb
  /** The emblem icon name of the list */
  emblem?: string
}

/** Input for creating a Reminder. */
export interface ReminderCreateInput {
  /** Reminder name */
  name: string
  /** Reminder notes */
  body?: string
  /** Whether the reminder is completed */
  completed?: boolean
  /** Due date */
  dueDate?: Date
  /** Remind me date */
  remindMeDate?: Date
  /** Priority (0=none, 1=high, 5=medium, 9=low) */
  priority?: Integer
  /** Whether to flag the reminder */
  flagged?: boolean
  /** The all-day due date of the reminder */
  allDayDueDate?: Date
  /** List identifier for the reminder */
  listId: string
}

/** Input for updating a Reminder. Omitted fields are left unchanged. */
export interface ReminderUpdateInput {
  /** Reminder name */
  name?: string
  /** Reminder notes */
  body?: string
  /** Whether the reminder is completed */
  completed?: boolean
  /** Due date */
  dueDate?: Date
  /** Remind me date */
  remindMeDate?: Date
  /** Priority (0=none, 1=high, 5=medium, 9=low) */
  priority?: Integer
  /** Whether to flag the reminder */
  flagged?: boolean
  /** The all-day due date of the reminder */
  allDayDueDate?: Date
  /** List identifier for the reminder */
  listId?: string
}

/** An account in the Reminders application */
export interface AccountResourceClient {
  /** List accounts. */
  list(options?: CallOptions): Promise<readonly Account[]>
}

/** A list of reminders */
export interface ListResourceClient {
  /** List lists. */
  list(options?: CallOptions): Promise<readonly List[]>
  /** Read the list identified by `id`. */
  get(id: string, options?: CallOptions): Promise<List>
  /** Create a list. */
  create(input: ListCreateInput, options?: CallOptions): Promise<List>
}

/** A reminder item */
export interface ReminderResourceClient {
  /** List reminders. */
  list(listId: string, options?: CallOptions): Promise<readonly Reminder[]>
  /** Read the reminder identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Reminder>
  /** Create a reminder. */
  create(input: ReminderCreateInput, options?: CallOptions): Promise<Reminder>
  /** Delete the reminder identified by `id`. */
  delete(id: string, options?: CallOptions): Promise<void>
  /** Mark a reminder as complete */
  complete(id: string, options?: CallOptions): Promise<void>
  /** Show the reminder in Reminders.app UI */
  show(options?: CallOptions): Promise<void>
}

/**
 * The Reminders client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link remindersContract}.
 */
export interface RemindersClient {
  /** An account in the Reminders application */
  readonly accounts: AccountResourceClient
  /** A list of reminders */
  readonly lists: ListResourceClient
  /** A reminder item */
  readonly reminders: ReminderResourceClient
}

const accountRecordType: ValueType<Account> = t.record(
  {
    name: t.string({ description: 'The name of the account' }),
    id: t.string({ description: 'The unique identifier of the account' }),
  },
  { description: 'An account in the Reminders application' }
)

const listRecordType: ValueType<List> = t.record(
  {
    name: t.string({ description: 'The name of the list' }),
    id: t.string({ description: 'The unique identifier of the list' }),
    color: t.rgb({ description: 'The color of the list' }),
    emblem: t.string({ description: 'The emblem icon name of the list' }),
  },
  { description: 'A list of reminders' }
)

const reminderRecordType: ValueType<Reminder> = t.record(
  {
    name: t.string({ description: 'The name of the reminder' }),
    id: t.string({ description: 'The unique identifier of the reminder' }),
    body: t.string({ description: 'The notes attached to the reminder' }),
    completed: t.boolean({ description: 'Whether the reminder is completed' }),
    completionDate: t.date({ description: 'The completion date of the reminder' }),
    dueDate: t.date({ description: 'The due date of the reminder' }),
    remindMeDate: t.date({ description: 'The remind date of the reminder' }),
    priority: t.integer({
      description: 'The priority of the reminder (0=none, 1=high, 5=medium, 9=low)',
    }),
    flagged: t.boolean({ description: 'Whether the reminder is flagged' }),
    creationDate: t.date({ description: 'The creation date of the reminder' }),
    modificationDate: t.date({ description: 'The modification date of the reminder' }),
    allDayDueDate: t.date({ description: 'The all-day due date of the reminder' }),
  },
  { description: 'A reminder item' }
)

const listCreateInputType: ValueType<ListCreateInput> = t.record({
  name: t.string({ description: 'List name' }),
  color: t.optional(t.rgb({ description: 'List color' })),
  emblem: t.optional(t.string({ description: 'The emblem icon name of the list' })),
})

const reminderCreateInputType: ValueType<ReminderCreateInput> = t.record({
  name: t.string({ description: 'Reminder name' }),
  body: t.optional(t.string({ description: 'Reminder notes' })),
  completed: t.optional(t.boolean({ description: 'Whether the reminder is completed' })),
  dueDate: t.optional(t.date({ description: 'Due date' })),
  remindMeDate: t.optional(t.date({ description: 'Remind me date' })),
  priority: t.optional(t.integer({ description: 'Priority (0=none, 1=high, 5=medium, 9=low)' })),
  flagged: t.optional(t.boolean({ description: 'Whether to flag the reminder' })),
  allDayDueDate: t.optional(t.date({ description: 'The all-day due date of the reminder' })),
  listId: t.string({ description: 'List identifier for the reminder' }),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<RemindersClient>['resources'] = {
  Account: {
    name: 'Account',
    record: accountRecordType,
    id: t.string({ description: 'The unique identifier of the account' }),
    list: 'reminders.accounts.listAccounts',
  },
  List: {
    name: 'List',
    record: listRecordType,
    id: t.string({ description: 'The unique identifier of the list' }),
    get: 'reminders.lists.get',
    list: 'reminders.lists.list',
  },
  Reminder: {
    name: 'Reminder',
    record: reminderRecordType,
    id: t.string({ description: 'The unique identifier of the reminder' }),
    get: 'reminders.reminders.getReminder',
    list: 'reminders.reminders.listReminders',
  },
}

const listListOperation: OperationDescriptor<Record<string, never>, readonly List[]> = {
  id: 'reminders.lists.list',
  permission: 'reminders:lists:list',
  target: { command: 'list', resource: 'List' },
  description: 'List all reminder lists',
  input: t.record({}),
  output: t.array(listRecordType),
}

const listGetOperation: OperationDescriptor<{ readonly id: string }, List> = {
  id: 'reminders.lists.get',
  permission: 'reminders:lists:get',
  target: { command: 'get', resource: 'List' },
  description: 'Get a reminder list by ID',
  input: t.record({
    id: t.string({ description: 'List identifier' }),
  }),
  output: listRecordType,
}

const listCreateOperation: OperationDescriptor<ListCreateInput, List> = {
  id: 'reminders.lists.create',
  permission: 'reminders:lists:create',
  target: { command: 'create', resource: 'List' },
  description: 'Create a new reminder list',
  input: listCreateInputType,
  output: listRecordType,
}

const reminderListRemindersOperation: OperationDescriptor<
  { readonly listId: string },
  readonly Reminder[]
> = {
  id: 'reminders.reminders.listReminders',
  permission: 'reminders:reminders:list',
  target: { command: 'listReminders', resource: 'Reminder' },
  description: 'List all reminders in a list',
  input: t.record({
    listId: t.string({ description: 'List identifier' }),
  }),
  output: t.array(reminderRecordType),
}

const reminderGetReminderOperation: OperationDescriptor<{ readonly id: string }, Reminder> = {
  id: 'reminders.reminders.getReminder',
  permission: 'reminders:reminders:get',
  target: { command: 'getReminder', resource: 'Reminder' },
  description: 'Get a reminder by ID',
  input: t.record({
    id: t.string({ description: 'Reminder identifier' }),
  }),
  output: reminderRecordType,
}

const reminderCreateReminderOperation: OperationDescriptor<ReminderCreateInput, Reminder> = {
  id: 'reminders.reminders.createReminder',
  permission: 'reminders:reminders:create',
  target: { command: 'createReminder', resource: 'Reminder' },
  description: 'Create a new reminder',
  input: reminderCreateInputType,
  output: reminderRecordType,
}

const reminderDeleteReminderOperation: OperationDescriptor<{ readonly id: string }, undefined> = {
  id: 'reminders.reminders.deleteReminder',
  permission: 'reminders:reminders:delete',
  target: { command: 'deleteReminder', resource: 'Reminder' },
  description: 'Delete a reminder',
  input: t.record({
    id: t.string({ description: 'Reminder identifier' }),
  }),
  output: t.none(),
}

const reminderCompleteReminderOperation: OperationDescriptor<{ readonly id: string }, undefined> = {
  id: 'reminders.reminders.completeReminder',
  permission: 'reminders:reminders:update',
  target: { command: 'completeReminder', resource: 'Reminder' },
  description: 'Mark a reminder as complete',
  input: t.record({
    id: t.string({ description: 'Reminder identifier' }),
  }),
  output: t.none(),
}

const reminderShowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'reminders.reminders.show',
  permission: 'reminders:reminders:show',
  target: { command: 'show', resource: 'Reminder' },
  description: 'Show the reminder in Reminders.app UI',
  input: t.record({}),
  output: t.none(),
}

const accountListAccountsOperation: OperationDescriptor<
  Record<string, never>,
  readonly Account[]
> = {
  id: 'reminders.accounts.listAccounts',
  permission: 'reminders:accounts:list',
  target: { command: 'listAccounts', resource: 'Account' },
  description: 'List all accounts',
  input: t.record({}),
  output: t.array(accountRecordType),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<RemindersClient>['operations'] = {
  'reminders.lists.list': listListOperation,
  'reminders.lists.get': listGetOperation,
  'reminders.lists.create': listCreateOperation,
  'reminders.reminders.listReminders': reminderListRemindersOperation,
  'reminders.reminders.getReminder': reminderGetReminderOperation,
  'reminders.reminders.createReminder': reminderCreateReminderOperation,
  'reminders.reminders.deleteReminder': reminderDeleteReminderOperation,
  'reminders.reminders.completeReminder': reminderCompleteReminderOperation,
  'reminders.reminders.show': reminderShowOperation,
  'reminders.accounts.listAccounts': accountListAccountsOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): RemindersClient {
  return {
    accounts: {
      list: (options) => runtime.invoke(accountListAccountsOperation, {}, options),
    },
    lists: {
      list: (options) => runtime.invoke(listListOperation, {}, options),
      get: (id, options) => runtime.invoke(listGetOperation, { id }, options),
      create: (input, options) => runtime.invoke(listCreateOperation, input, options),
    },
    reminders: {
      list: (listId, options) =>
        runtime.invoke(reminderListRemindersOperation, { listId }, options),
      get: (id, options) => runtime.invoke(reminderGetReminderOperation, { id }, options),
      create: (input, options) => runtime.invoke(reminderCreateReminderOperation, input, options),
      delete: (id, options) => runtime.invoke(reminderDeleteReminderOperation, { id }, options),
      complete: (id, options) => runtime.invoke(reminderCompleteReminderOperation, { id }, options),
      show: (options) => runtime.invoke(reminderShowOperation, {}, options),
    },
  }
}

/**
 * The Reminders contract. Pass it to a client factory to obtain a
 * {@link RemindersClient}.
 */
export const remindersContract: AppContract<RemindersClient> = {
  app: 'reminders',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

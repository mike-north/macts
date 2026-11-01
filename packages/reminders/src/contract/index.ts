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
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `RemindersClient`; application code changes locality by
 * changing the factory, not the contract.
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
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** Priority level for reminders */
export type ReminderPriority = '0' | '9' | '5' | '1'

/** An account in the Reminders application */
export interface Account {
  /**
   * The name of the account.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the account.
   * Never null: the primary identifier.
   */
  readonly id: string
}

/** A list of reminders */
export interface List {
  /**
   * The name of the list.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The unique identifier of the list.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The color of the list.
   * Nullable. Observed missing in 2 of 3 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  color: string | null
  /**
   * The emblem icon name of the list.
   * Nullable. Observed missing in 3 of 3 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  emblem: string | null
}

/** A reminder item */
export interface Reminder {
  /**
   * The name of the reminder.
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  name: string
  /**
   * The unique identifier of the reminder.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The notes attached to the reminder.
   * Nullable. No evidence that the app always sets it.
   */
  body: string | null
  /**
   * Whether the reminder is completed.
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  completed: boolean
  /**
   * The completion date of the reminder.
   * Nullable: Set only when a reminder is completed; an open reminder has no completion date. Not
   * observable on the probed library, where all 412 reminders were completed (Reminders 7.0).
   */
  readonly completionDate: Date | null
  /**
   * The due date of the reminder.
   * Nullable. Observed missing in 15 of 412 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  dueDate: Date | null
  /**
   * The remind date of the reminder.
   * Nullable. Observed missing in 15 of 412 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  remindMeDate: Date | null
  /**
   * The priority of the reminder (0=none, 1=high, 5=medium, 9=low).
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  priority: Integer
  /**
   * Whether the reminder is flagged.
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  flagged: boolean
  /**
   * The creation date of the reminder.
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  readonly creationDate: Date
  /**
   * The modification date of the reminder.
   * Never null: observed in all 60 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  readonly modificationDate: Date
  /**
   * The all-day due date of the reminder.
   * Nullable. Observed missing in 15 of 412 items (Reminders 7.0, macOS 27.2, 2026-11-01).
   */
  alldayDueDate: Date | null
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
  color?: string
  /** The emblem icon name of the list */
  emblem?: string
}

/** Input for updating a List. Omitted fields are left unchanged. */
export interface ListUpdateInput {
  /**
   * List name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * List color.
   * Cannot be reset: null is rejected.
   */
  color?: string
  /**
   * The emblem icon name of the list.
   * Cannot be reset: null is rejected.
   */
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
  alldayDueDate?: Date
  /** List identifier for the reminder */
  listId: string
}

/** Input for updating a Reminder. Omitted fields are left unchanged. */
export interface ReminderUpdateInput {
  /**
   * Reminder name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Reminder notes.
   * Cannot be reset: null is rejected.
   */
  body?: string
  /**
   * Whether the reminder is completed.
   * Cannot be reset: null is rejected.
   */
  completed?: boolean
  /**
   * Due date.
   * Cannot be reset: null is rejected.
   */
  dueDate?: Date
  /**
   * Remind me date.
   * Cannot be reset: null is rejected.
   */
  remindMeDate?: Date
  /**
   * Priority (0=none, 1=high, 5=medium, 9=low).
   * Cannot be reset: null is rejected.
   */
  priority?: Integer
  /**
   * Whether to flag the reminder.
   * Cannot be reset: null is rejected.
   */
  flagged?: boolean
  /**
   * The all-day due date of the reminder.
   * Cannot be reset: null is rejected.
   */
  alldayDueDate?: Date
  /**
   * List identifier for the reminder.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Read the list identified by `id`.
   *
   * @param id - List identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<List>
  /** Create a list. */
  create(input: ListCreateInput, options?: CallOptions): Promise<List>
}

/** A reminder item */
export interface ReminderResourceClient {
  /**
   * List reminders.
   *
   * @param listId - List identifier. Does not accept null.
   */
  list(listId: string, options?: CallOptions): Promise<readonly Reminder[]>
  /**
   * Read the reminder identified by `id`.
   *
   * @param id - Reminder identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Reminder>
  /** Create a reminder. */
  create(input: ReminderCreateInput, options?: CallOptions): Promise<Reminder>
  /**
   * Delete the reminder identified by `id`.
   *
   * @param id - Reminder identifier. Does not accept null.
   */
  delete(id: string, options?: CallOptions): Promise<void>
  /**
   * Mark a reminder as complete
   *
   * @param id - Reminder identifier. Does not accept null.
   */
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
    name: t.nullable(t.string(), { description: 'The name of the account' }),
    id: t.string({ description: 'The unique identifier of the account' }),
  },
  { description: 'An account in the Reminders application' }
)

const listRecordType: ValueType<List> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the list' }),
    id: t.string({ description: 'The unique identifier of the list' }),
    color: t.nullable(t.string(), { description: 'The color of the list' }),
    emblem: t.nullable(t.string(), { description: 'The emblem icon name of the list' }),
  },
  { description: 'A list of reminders' }
)

const reminderRecordType: ValueType<Reminder> = t.record(
  {
    name: t.string({ description: 'The name of the reminder' }),
    id: t.string({ description: 'The unique identifier of the reminder' }),
    body: t.nullable(t.string(), { description: 'The notes attached to the reminder' }),
    completed: t.boolean({ description: 'Whether the reminder is completed' }),
    completionDate: t.nullable(t.date(), { description: 'The completion date of the reminder' }),
    dueDate: t.nullable(t.date(), { description: 'The due date of the reminder' }),
    remindMeDate: t.nullable(t.date(), { description: 'The remind date of the reminder' }),
    priority: t.integer({
      description: 'The priority of the reminder (0=none, 1=high, 5=medium, 9=low)',
    }),
    flagged: t.boolean({ description: 'Whether the reminder is flagged' }),
    creationDate: t.date({ description: 'The creation date of the reminder' }),
    modificationDate: t.date({ description: 'The modification date of the reminder' }),
    alldayDueDate: t.nullable(t.date(), { description: 'The all-day due date of the reminder' }),
  },
  { description: 'A reminder item' }
)

const listCreateInputType: ValueType<ListCreateInput> = t.record({
  name: t.string({ description: 'List name' }),
  color: t.optional(t.string({ description: 'List color' })),
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
  alldayDueDate: t.optional(t.date({ description: 'The all-day due date of the reminder' })),
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
    list: 'reminders.accounts.list',
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
    get: 'reminders.reminders.get',
    list: 'reminders.reminders.list',
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
  id: 'reminders.reminders.list',
  permission: 'reminders:reminders:list',
  target: { command: 'listReminders', resource: 'Reminder' },
  description: 'List all reminders in a list',
  input: t.record({
    listId: t.string({ description: 'List identifier' }),
  }),
  output: t.array(reminderRecordType),
}

const reminderGetReminderOperation: OperationDescriptor<{ readonly id: string }, Reminder> = {
  id: 'reminders.reminders.get',
  permission: 'reminders:reminders:get',
  target: { command: 'getReminder', resource: 'Reminder' },
  description: 'Get a reminder by ID',
  input: t.record({
    id: t.string({ description: 'Reminder identifier' }),
  }),
  output: reminderRecordType,
}

const reminderCreateReminderOperation: OperationDescriptor<ReminderCreateInput, Reminder> = {
  id: 'reminders.reminders.create',
  permission: 'reminders:reminders:create',
  target: { command: 'createReminder', resource: 'Reminder' },
  description: 'Create a new reminder',
  input: reminderCreateInputType,
  output: reminderRecordType,
}

const reminderDeleteReminderOperation: OperationDescriptor<{ readonly id: string }, undefined> = {
  id: 'reminders.reminders.delete',
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
  id: 'reminders.accounts.list',
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
  'reminders.reminders.list': reminderListRemindersOperation,
  'reminders.reminders.get': reminderGetReminderOperation,
  'reminders.reminders.create': reminderCreateReminderOperation,
  'reminders.reminders.delete': reminderDeleteReminderOperation,
  'reminders.reminders.completeReminder': reminderCompleteReminderOperation,
  'reminders.reminders.show': reminderShowOperation,
  'reminders.accounts.list': accountListAccountsOperation,
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

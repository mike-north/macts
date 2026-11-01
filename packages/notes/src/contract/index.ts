/**
 * The Notes contract: the transport-neutral description of every
 * Notes operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `NotesClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `NotesClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Notes manifest; do not edit.
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

/** A Notes account */
export interface Account {
  /**
   * The name of the account.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * The unique identifier of the account.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Whether the account has been upgraded.
   * Nullable. No evidence that the app always sets it.
   */
  readonly upgraded: boolean | null
}

/** A Notes folder */
export interface Folder {
  /**
   * The name of the folder.
   * Never null: the primary identifier.
   */
  name: string
  /**
   * The unique identifier of the folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Whether the folder is shared.
   * Nullable. No evidence that the app always sets it.
   */
  readonly shared: boolean | null
}

/** A note */
export interface Note {
  /**
   * The name of the note (first line).
   * Never null: the primary identifier.
   */
  name: string
  /**
   * The unique identifier of the note.
   * Never null: observed in all 60 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly id: string
  /**
   * The HTML content of the note body.
   * Nullable. No evidence that the app always sets it.
   */
  body: string | null
  /**
   * The plaintext content of the note.
   * Nullable. No evidence that the app always sets it.
   */
  readonly plaintext: string | null
  /**
   * The creation date of the note.
   * Never null: observed in all 60 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly creationDate: Date
  /**
   * The modification date of the note.
   * Never null: observed in all 60 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly modificationDate: Date
  /**
   * Whether the note is shared.
   * Never null: observed in all 60 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly shared: boolean
  /**
   * Whether the note is password protected.
   * Never null: observed in all 60 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly passwordProtected: boolean
}

/** A note attachment */
export interface Attachment {
  /**
   * The name of the attachment.
   * Nullable. Observed missing in 10 of 25 items (Notes 4.13, macOS 27.2, 2026-11-01).
   */
  readonly name: string | null
  /**
   * The unique identifier of the attachment.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The content identifier of the attachment.
   * Nullable. No evidence that the app always sets it.
   */
  readonly contentIdentifier?: string | null
  /**
   * The creation date of the attachment.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * The modification date of the attachment.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
}

/** Input for creating an Account. */
export type AccountCreateInput = Record<string, never>

/** Input for updating an Account. Omitted fields are left unchanged. */
export type AccountUpdateInput = Record<string, never>

/** Input for creating a Folder. */
export interface FolderCreateInput {
  /** The name of the folder */
  name?: string
}

/** Input for updating a Folder. Omitted fields are left unchanged. */
export interface FolderUpdateInput {
  /**
   * The name of the folder.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating a Note. */
export interface NoteCreateInput {
  /** The name of the note (first line) */
  name?: string
  /** HTML content of the note */
  body?: string
}

/** Input for updating a Note. Omitted fields are left unchanged. */
export interface NoteUpdateInput {
  /**
   * The name of the note (first line).
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * HTML content of the note.
   * Cannot be reset: null is rejected.
   */
  body?: string
}

/** Input for creating an Attachment. */
export type AttachmentCreateInput = Record<string, never>

/** Input for updating an Attachment. Omitted fields are left unchanged. */
export type AttachmentUpdateInput = Record<string, never>

/** A Notes account */
export interface AccountResourceClient {
  /** List accounts. */
  list(options?: CallOptions): Promise<readonly Account[]>
  /**
   * Read the account identified by `name`.
   *
   * @param name - Item name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Account>
}

/** A Notes folder */
export interface FolderResourceClient {
  /** List folders. */
  list(options?: CallOptions): Promise<readonly Folder[]>
  /**
   * Read the folder identified by `name`.
   *
   * @param name - Item name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Folder>
}

/** A note */
export interface NoteResourceClient {
  /** List notes. */
  list(options?: CallOptions): Promise<readonly Note[]>
  /**
   * Read the note identified by `name`.
   *
   * @param name - Item name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Note>
  /** Create a note. */
  create(input: NoteCreateInput, options?: CallOptions): Promise<Note>
  /**
   * Show a note in the Notes app
   *
   * @param name - Note name. Does not accept null.
   */
  show(name: string, options?: CallOptions): Promise<void>
}

/** A note attachment */
export interface AttachmentResourceClient {
  /** List attachments. */
  list(options?: CallOptions): Promise<readonly Attachment[]>
  /**
   * Read the attachment identified by `id`.
   *
   * @param id - Attachment identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Attachment>
}

/**
 * The Notes client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link notesContract}.
 */
export interface NotesClient {
  /** A Notes account */
  readonly accounts: AccountResourceClient
  /** A Notes folder */
  readonly folders: FolderResourceClient
  /** A note */
  readonly notes: NoteResourceClient
  /** A note attachment */
  readonly attachments: AttachmentResourceClient
}

const accountRecordType: ValueType<Account> = t.record(
  {
    name: t.string({ description: 'The name of the account' }),
    id: t.nullable(t.string(), { description: 'The unique identifier of the account' }),
    upgraded: t.nullable(t.boolean(), { description: 'Whether the account has been upgraded' }),
  },
  { description: 'A Notes account' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    name: t.string({ description: 'The name of the folder' }),
    id: t.nullable(t.string(), { description: 'The unique identifier of the folder' }),
    shared: t.nullable(t.boolean(), { description: 'Whether the folder is shared' }),
  },
  { description: 'A Notes folder' }
)

const noteRecordType: ValueType<Note> = t.record(
  {
    name: t.string({ description: 'The name of the note (first line)' }),
    id: t.string({ description: 'The unique identifier of the note' }),
    body: t.nullable(t.string(), { description: 'The HTML content of the note body' }),
    plaintext: t.nullable(t.string(), { description: 'The plaintext content of the note' }),
    creationDate: t.date({ description: 'The creation date of the note' }),
    modificationDate: t.date({ description: 'The modification date of the note' }),
    shared: t.boolean({ description: 'Whether the note is shared' }),
    passwordProtected: t.boolean({ description: 'Whether the note is password protected' }),
  },
  { description: 'A note' }
)

const attachmentRecordType: ValueType<Attachment> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the attachment' }),
    id: t.string({ description: 'The unique identifier of the attachment' }),
    contentIdentifier: t.optional(
      t.nullable(t.string(), { description: 'The content identifier of the attachment' })
    ),
    creationDate: t.nullable(t.date(), { description: 'The creation date of the attachment' }),
    modificationDate: t.nullable(t.date(), {
      description: 'The modification date of the attachment',
    }),
  },
  { description: 'A note attachment' }
)

const noteCreateInputType: ValueType<NoteCreateInput> = t.record({
  name: t.optional(t.string({ description: 'The name of the note (first line)' })),
  body: t.optional(t.string({ description: 'HTML content of the note' })),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<NotesClient>['resources'] = {
  Account: {
    name: 'Account',
    record: accountRecordType,
    id: t.string({ description: 'The name of the account' }),
    get: 'notes.accounts.get',
    list: 'notes.accounts.list',
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
    id: t.string({ description: 'The name of the folder' }),
    get: 'notes.folders.get',
    list: 'notes.folders.list',
  },
  Note: {
    name: 'Note',
    record: noteRecordType,
    id: t.string({ description: 'The name of the note (first line)' }),
    get: 'notes.notes.get',
    list: 'notes.notes.list',
  },
  Attachment: {
    name: 'Attachment',
    record: attachmentRecordType,
    id: t.string({ description: 'The unique identifier of the attachment' }),
    get: 'notes.attachments.get',
    list: 'notes.attachments.list',
  },
}

const accountListOperation: OperationDescriptor<Record<string, never>, readonly Account[]> = {
  id: 'notes.accounts.list',
  permission: 'notes:accounts:list',
  target: { command: 'list', resource: 'Account' },
  description: 'List items',
  input: t.record({}),
  output: t.array(accountRecordType),
}

const folderListOperation: OperationDescriptor<Record<string, never>, readonly Folder[]> = {
  id: 'notes.folders.list',
  permission: 'notes:folders:list',
  target: { command: 'list', resource: 'Folder' },
  description: 'List items',
  input: t.record({}),
  output: t.array(folderRecordType),
}

const noteListOperation: OperationDescriptor<Record<string, never>, readonly Note[]> = {
  id: 'notes.notes.list',
  permission: 'notes:notes:list',
  target: { command: 'list', resource: 'Note' },
  description: 'List items',
  input: t.record({}),
  output: t.array(noteRecordType),
}

const attachmentListOperation: OperationDescriptor<Record<string, never>, readonly Attachment[]> = {
  id: 'notes.attachments.list',
  permission: 'notes:attachments:list',
  target: { command: 'list', resource: 'Attachment' },
  description: 'List items',
  input: t.record({}),
  output: t.array(attachmentRecordType),
}

const accountGetOperation: OperationDescriptor<{ readonly name: string }, Account> = {
  id: 'notes.accounts.get',
  permission: 'notes:accounts:get',
  target: { command: 'get', resource: 'Account' },
  description: 'Get an item by name',
  input: t.record({
    name: t.string({ description: 'Item name' }),
  }),
  output: accountRecordType,
}

const folderGetOperation: OperationDescriptor<{ readonly name: string }, Folder> = {
  id: 'notes.folders.get',
  permission: 'notes:folders:get',
  target: { command: 'get', resource: 'Folder' },
  description: 'Get an item by name',
  input: t.record({
    name: t.string({ description: 'Item name' }),
  }),
  output: folderRecordType,
}

const noteGetOperation: OperationDescriptor<{ readonly name: string }, Note> = {
  id: 'notes.notes.get',
  permission: 'notes:notes:get',
  target: { command: 'get', resource: 'Note' },
  description: 'Get an item by name',
  input: t.record({
    name: t.string({ description: 'Item name' }),
  }),
  output: noteRecordType,
}

const attachmentGetAttachmentOperation: OperationDescriptor<{ readonly id: string }, Attachment> = {
  id: 'notes.attachments.get',
  permission: 'notes:attachments:get',
  target: { command: 'getAttachment', resource: 'Attachment' },
  description: 'Get an attachment by ID',
  input: t.record({
    id: t.string({ description: 'Attachment identifier' }),
  }),
  output: attachmentRecordType,
}

const noteCreateOperation: OperationDescriptor<NoteCreateInput, Note> = {
  id: 'notes.notes.create',
  permission: 'notes:notes:create',
  target: { command: 'create', resource: 'Note' },
  description: 'Create a new note',
  input: noteCreateInputType,
  output: noteRecordType,
}

const noteShowOperation: OperationDescriptor<{ readonly name: string }, undefined> = {
  id: 'notes.notes.show',
  permission: 'notes:notes:show',
  target: { command: 'show', resource: 'Note' },
  description: 'Show a note in the Notes app',
  input: t.record({
    name: t.string({ description: 'Note name' }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<NotesClient>['operations'] = {
  'notes.accounts.list': accountListOperation,
  'notes.folders.list': folderListOperation,
  'notes.notes.list': noteListOperation,
  'notes.attachments.list': attachmentListOperation,
  'notes.accounts.get': accountGetOperation,
  'notes.folders.get': folderGetOperation,
  'notes.notes.get': noteGetOperation,
  'notes.attachments.get': attachmentGetAttachmentOperation,
  'notes.notes.create': noteCreateOperation,
  'notes.notes.show': noteShowOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): NotesClient {
  return {
    accounts: {
      list: (options) => runtime.invoke(accountListOperation, {}, options),
      get: (name, options) => runtime.invoke(accountGetOperation, { name }, options),
    },
    folders: {
      list: (options) => runtime.invoke(folderListOperation, {}, options),
      get: (name, options) => runtime.invoke(folderGetOperation, { name }, options),
    },
    notes: {
      list: (options) => runtime.invoke(noteListOperation, {}, options),
      get: (name, options) => runtime.invoke(noteGetOperation, { name }, options),
      create: (input, options) => runtime.invoke(noteCreateOperation, input, options),
      show: (name, options) => runtime.invoke(noteShowOperation, { name }, options),
    },
    attachments: {
      list: (options) => runtime.invoke(attachmentListOperation, {}, options),
      get: (id, options) => runtime.invoke(attachmentGetAttachmentOperation, { id }, options),
    },
  }
}

/**
 * The Notes contract. Pass it to a client factory to obtain a
 * {@link NotesClient}.
 */
export const notesContract: AppContract<NotesClient> = {
  app: 'notes',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

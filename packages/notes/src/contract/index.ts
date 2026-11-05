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
  type ClientBrand,
  type ClientRuntime,
  type OperationDescriptor,
  type Page,
  type PageRequest,
  type ResourceDescriptor,
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
  /** List accounts, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Account>>
  /**
   * Read the account identified by `name`. When several accounts share the same name, the first
   * match in the app's order is used, and the operation does not fail as ambiguous.
   *
   * @param name - Item name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Account>
}

/** A Notes folder */
export interface FolderResourceClient {
  /** List folders, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Folder>>
  /**
   * Read the folder identified by `name`. When several folders share the same name, the first match
   * in the app's order is used, and the operation does not fail as ambiguous.
   *
   * @param name - Item name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Folder>
}

/** A note */
export interface NoteResourceClient {
  /** List notes, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Note>>
  /**
   * Read the note identified by `name`. When several notes share the same name, the first match in
   * the app's order is used, and the operation does not fail as ambiguous.
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
  /**
   * List attachments, one page at a time.
   *
   * @param page - The page size, and the cursor that continues from the previous page.
   * @returns One page of results. When `nextCursor` is present, more remain: call again with the
   * same arguments and that cursor.
   */
  list(page?: PageRequest, options?: CallOptions): Promise<Page<Attachment>>
  /**
   * Read the attachment identified by `id`.
   *
   * @param id - Attachment identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Attachment>
}

/**
 * The Notes client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link notesContract}. Its type carries the contract's resource
 * table, {@link NotesResources}, so references can be bound to it by resource; the brand has no
 * runtime member.
 */
export interface NotesClient extends ClientBrand<NotesResources> {
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
 * The type of the resource table of {@link notesContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type NotesResources = Readonly<{
  Account: ResourceDescriptor<Account, string> & {
    readonly id: ValueType<string>
    readonly get: 'notes.accounts.get'
    readonly list: 'notes.accounts.list'
  }
  Folder: ResourceDescriptor<Folder, string> & {
    readonly id: ValueType<string>
    readonly get: 'notes.folders.get'
    readonly list: 'notes.folders.list'
  }
  Note: ResourceDescriptor<Note, string> & {
    readonly id: ValueType<string>
    readonly get: 'notes.notes.get'
    readonly list: 'notes.notes.list'
  }
  Attachment: ResourceDescriptor<Attachment, string> & {
    readonly id: ValueType<string>
    readonly get: 'notes.attachments.get'
    readonly list: 'notes.attachments.list'
  }
}>

/**
 * The resource table: the implementation of {@link NotesResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
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
} satisfies NotesResources

const accountListOperation: OperationDescriptor<Record<string, never>, Page<Account>> = {
  id: 'notes.accounts.list',
  permission: 'notes:accounts:list',
  target: { command: 'list', resource: 'Account' },
  description: 'List items',
  input: t.record({}),
  output: t.page(accountRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const folderListOperation: OperationDescriptor<Record<string, never>, Page<Folder>> = {
  id: 'notes.folders.list',
  permission: 'notes:folders:list',
  target: { command: 'list', resource: 'Folder' },
  description: 'List items',
  input: t.record({}),
  output: t.page(folderRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const noteListOperation: OperationDescriptor<Record<string, never>, Page<Note>> = {
  id: 'notes.notes.list',
  permission: 'notes:notes:list',
  target: { command: 'list', resource: 'Note' },
  description: 'List items',
  input: t.record({}),
  output: t.page(noteRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const attachmentListOperation: OperationDescriptor<PageRequest, Page<Attachment>> = {
  id: 'notes.attachments.list',
  permission: 'notes:attachments:list',
  target: { command: 'list', resource: 'Attachment' },
  description: 'List items',
  input: t.record({
    ...t.pageInputs(),
  }),
  output: t.page(attachmentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      pageSize: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The most items to return, from 1 to 100. Defaults to 25.',
      },
      cursor: {
        type: 'string',
        description:
          'The nextCursor of the previous page, sent with the same other inputs, to read the next page. Omit it to read the first page.',
      },
    },
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item name' } },
    required: ['name'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item name' } },
    required: ['name'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item name' } },
    required: ['name'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Attachment identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const noteCreateOperation: OperationDescriptor<NoteCreateInput, Note> = {
  id: 'notes.notes.create',
  permission: 'notes:notes:create',
  target: { command: 'create', resource: 'Note' },
  description: 'Create a new note',
  input: noteCreateInputType,
  output: noteRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name of the note (first line)' },
      body: { type: 'string', description: 'HTML content of the note' },
    },
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Note name' } },
    required: ['name'],
    additionalProperties: false,
  },
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
      list: (page, options) => runtime.invoke(attachmentListOperation, { ...page }, options),
      get: (id, options) => runtime.invoke(attachmentGetAttachmentOperation, { id }, options),
    },
  }
}

/**
 * The Notes contract. Pass it to a client factory to obtain a
 * {@link NotesClient}.
 */
export const notesContract: AppContract<NotesClient, NotesResources> = {
  app: 'notes',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

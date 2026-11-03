/**
 * The Shortcuts contract: the transport-neutral description of every
 * Shortcuts operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ShortcutsClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ShortcutsClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Shortcuts manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileValue,
  type Integer,
  type OperationDescriptor,
  type Page,
  type PageRequest,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A shortcut in the Shortcuts application */
export interface Shortcut {
  /**
   * The name of the shortcut.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The shortcut's subtitle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly subtitle: string | null
  /**
   * The unique identifier of the shortcut.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The folder containing this shortcut (folder ID).
   * Nullable. No evidence that the app always sets it.
   */
  folder: string | null
  /**
   * The shortcut's color.
   * Nullable. No evidence that the app always sets it.
   */
  readonly color: Rgb | null
  /**
   * The shortcut's icon (TIFF image data).
   * Nullable. No evidence that the app always sets it.
   */
  readonly icon: FileValue | null
  /**
   * Indicates whether or not the shortcut accepts input data.
   * Nullable. No evidence that the app always sets it.
   */
  readonly acceptsInput: boolean | null
  /**
   * The number of actions in the shortcut.
   * Nullable. No evidence that the app always sets it.
   */
  readonly actionCount: Integer | null
}

/** A folder containing shortcuts */
export interface Folder {
  /**
   * The name of the folder.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The unique identifier of the folder.
   * Never null: the primary identifier.
   */
  readonly id: string
}

/** Input for creating a Shortcut. */
export interface ShortcutCreateInput {
  /** The folder containing this shortcut (folder ID) */
  folder?: string
}

/** Input for updating a Shortcut. Omitted fields are left unchanged. */
export interface ShortcutUpdateInput {
  /**
   * The folder containing this shortcut (folder ID).
   * Cannot be reset: null is rejected.
   */
  folder?: string
}

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

/** A shortcut in the Shortcuts application */
export interface ShortcutResourceClient {
  /**
   * List shortcuts, one page at a time.
   *
   * @param page - The page size, and the cursor that continues from the previous page.
   * @returns One page of results. When `nextCursor` is present, more remain: call again with the
   * same arguments and that cursor.
   */
  list(page?: PageRequest, options?: CallOptions): Promise<Page<Shortcut>>
  /**
   * Read the shortcut identified by `id`.
   *
   * @param id - Shortcut identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Shortcut>
  /**
   * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell
   * 'Shortcuts Events' instead of 'Shortcuts'.
   *
   * @param id - The shortcut to run. Does not accept null.
   * @param withInput - The input to provide to the shortcut. Does not accept null.
   */
  run(id: string, withInput?: unknown, options?: CallOptions): Promise<void>
}

/** A folder containing shortcuts */
export interface FolderResourceClient {
  /**
   * List folders, one page at a time.
   *
   * @param page - The page size, and the cursor that continues from the previous page.
   * @returns One page of results. When `nextCursor` is present, more remain: call again with the
   * same arguments and that cursor.
   */
  list(page?: PageRequest, options?: CallOptions): Promise<Page<Folder>>
  /**
   * Read the folder identified by `id`.
   *
   * @param id - Folder identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Folder>
}

/**
 * The Shortcuts client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link shortcutsContract}.
 */
export interface ShortcutsClient {
  /** A shortcut in the Shortcuts application */
  readonly shortcuts: ShortcutResourceClient
  /** A folder containing shortcuts */
  readonly folders: FolderResourceClient
}

const shortcutRecordType: ValueType<Shortcut> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the shortcut' }),
    subtitle: t.nullable(t.string(), { description: "The shortcut's subtitle" }),
    id: t.string({ description: 'The unique identifier of the shortcut' }),
    folder: t.nullable(t.string(), {
      description: 'The folder containing this shortcut (folder ID)',
    }),
    color: t.nullable(t.rgb(), { description: "The shortcut's color" }),
    icon: t.nullable(t.file(), { description: "The shortcut's icon (TIFF image data)" }),
    acceptsInput: t.nullable(t.boolean(), {
      description: 'Indicates whether or not the shortcut accepts input data',
    }),
    actionCount: t.nullable(t.integer(), { description: 'The number of actions in the shortcut' }),
  },
  { description: 'A shortcut in the Shortcuts application' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the folder' }),
    id: t.string({ description: 'The unique identifier of the folder' }),
  },
  { description: 'A folder containing shortcuts' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources = {
  Shortcut: {
    name: 'Shortcut',
    record: shortcutRecordType,
    id: t.string({ description: 'The unique identifier of the shortcut' }),
    get: 'shortcuts.shortcuts.get',
    list: 'shortcuts.shortcuts.list',
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
    id: t.string({ description: 'The unique identifier of the folder' }),
    get: 'shortcuts.folders.get',
    list: 'shortcuts.folders.list',
  },
} as const satisfies AppContract<ShortcutsClient>['resources']

/**
 * The type of the resource table of {@link shortcutsContract}: each resource key,
 * the operations that resolve references to it, and its record and identifier
 * types. A client created from the contract carries it, so `bindReference`
 * admits only references the contract can resolve.
 */
export type ShortcutsResources = typeof resources

const shortcutListOperation: OperationDescriptor<PageRequest, Page<Shortcut>> = {
  id: 'shortcuts.shortcuts.list',
  permission: 'shortcuts:shortcuts:list',
  target: { command: 'list', resource: 'Shortcut' },
  description: 'List all shortcuts',
  input: t.record({
    ...t.pageInputs(),
  }),
  output: t.page(shortcutRecordType),
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

const shortcutGetOperation: OperationDescriptor<{ readonly id: string }, Shortcut> = {
  id: 'shortcuts.shortcuts.get',
  permission: 'shortcuts:shortcuts:get',
  target: { command: 'get', resource: 'Shortcut' },
  description: 'Get a shortcut by ID',
  input: t.record({
    id: t.string({ description: 'Shortcut identifier' }),
  }),
  output: shortcutRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Shortcut identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const shortcutRunOperation: OperationDescriptor<
  { readonly id: string; readonly withInput?: unknown },
  undefined
> = {
  id: 'shortcuts.shortcuts.run',
  permission: 'shortcuts:shortcuts:run',
  target: { command: 'run', resource: 'Shortcut' },
  description:
    "Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.",
  input: t.record({
    id: t.string({ description: 'The shortcut to run' }),
    withInput: t.optional(t.unknown({ description: 'The input to provide to the shortcut' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The shortcut to run' },
      withInput: {
        allOf: [
          { description: 'The input to provide to the shortcut', $ref: '#/definitions/__schema0' },
        ],
      },
    },
    required: ['id'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const folderListFoldersOperation: OperationDescriptor<PageRequest, Page<Folder>> = {
  id: 'shortcuts.folders.list',
  permission: 'shortcuts:folders:list',
  target: { command: 'listFolders', resource: 'Folder' },
  description: 'List all folders',
  input: t.record({
    ...t.pageInputs(),
  }),
  output: t.page(folderRecordType),
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

const folderGetFolderOperation: OperationDescriptor<{ readonly id: string }, Folder> = {
  id: 'shortcuts.folders.get',
  permission: 'shortcuts:folders:get',
  target: { command: 'getFolder', resource: 'Folder' },
  description: 'Get a folder by ID',
  input: t.record({
    id: t.string({ description: 'Folder identifier' }),
  }),
  output: folderRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Folder identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ShortcutsClient>['operations'] = {
  'shortcuts.shortcuts.list': shortcutListOperation,
  'shortcuts.shortcuts.get': shortcutGetOperation,
  'shortcuts.shortcuts.run': shortcutRunOperation,
  'shortcuts.folders.list': folderListFoldersOperation,
  'shortcuts.folders.get': folderGetFolderOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ShortcutsClient {
  return {
    shortcuts: {
      list: (page, options) => runtime.invoke(shortcutListOperation, { ...page }, options),
      get: (id, options) => runtime.invoke(shortcutGetOperation, { id }, options),
      run: (id, withInput, options) =>
        runtime.invoke(shortcutRunOperation, { id, withInput }, options),
    },
    folders: {
      list: (page, options) => runtime.invoke(folderListFoldersOperation, { ...page }, options),
      get: (id, options) => runtime.invoke(folderGetFolderOperation, { id }, options),
    },
  }
}

/**
 * The Shortcuts contract. Pass it to a client factory to obtain a
 * {@link ShortcutsClient}.
 */
export const shortcutsContract: AppContract<ShortcutsClient, ShortcutsResources> = {
  app: 'shortcuts',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

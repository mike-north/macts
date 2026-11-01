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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `ShortcutsClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { shortcutsContract } from '@macts/shortcuts/contract'
 *
 * const client = createClient(shortcutsContract, { token, url })
 * ```
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
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A shortcut in the Shortcuts application */
export interface Shortcut {
  /** The name of the shortcut */
  readonly name: string
  /** The shortcut's subtitle */
  readonly subtitle: string
  /** The unique identifier of the shortcut */
  readonly id: string
  /** The folder containing this shortcut (folder ID) */
  folder: string
  /** The shortcut's color */
  readonly color: Rgb
  /** The shortcut's icon (TIFF image data) */
  readonly icon: FileValue
  /** Indicates whether or not the shortcut accepts input data */
  readonly acceptsInput: boolean
  /** The number of actions in the shortcut */
  readonly actionCount: Integer
}

/** A folder containing shortcuts */
export interface Folder {
  /** The name of the folder */
  name: string
  /** The unique identifier of the folder */
  readonly id: string
}

/** Input for creating a Shortcut. */
export interface ShortcutCreateInput {
  /** The folder containing this shortcut (folder ID) */
  folder?: string
}

/** Input for updating a Shortcut. Omitted fields are left unchanged. */
export interface ShortcutUpdateInput {
  /** The folder containing this shortcut (folder ID) */
  folder?: string
}

/** Input for creating a Folder. */
export interface FolderCreateInput {
  /** The name of the folder */
  name?: string
}

/** Input for updating a Folder. Omitted fields are left unchanged. */
export interface FolderUpdateInput {
  /** The name of the folder */
  name?: string
}

/** A shortcut in the Shortcuts application */
export interface ShortcutResourceClient {
  /** List shortcuts. */
  list(options?: CallOptions): Promise<readonly Shortcut[]>
  /** Read the shortcut identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Shortcut>
  /**
   * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell
   * 'Shortcuts Events' instead of 'Shortcuts'.
   */
  run(id: string, withInput?: unknown, options?: CallOptions): Promise<void>
}

/** A folder containing shortcuts */
export interface FolderResourceClient {
  /** List folders. */
  list(options?: CallOptions): Promise<readonly Folder[]>
  /** Read the folder identified by `id`. */
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
    name: t.string({ description: 'The name of the shortcut' }),
    subtitle: t.string({ description: "The shortcut's subtitle" }),
    id: t.string({ description: 'The unique identifier of the shortcut' }),
    folder: t.string({ description: 'The folder containing this shortcut (folder ID)' }),
    color: t.rgb({ description: "The shortcut's color" }),
    icon: t.file({ description: "The shortcut's icon (TIFF image data)" }),
    acceptsInput: t.boolean({
      description: 'Indicates whether or not the shortcut accepts input data',
    }),
    actionCount: t.integer({ description: 'The number of actions in the shortcut' }),
  },
  { description: 'A shortcut in the Shortcuts application' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    name: t.string({ description: 'The name of the folder' }),
    id: t.string({ description: 'The unique identifier of the folder' }),
  },
  { description: 'A folder containing shortcuts' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ShortcutsClient>['resources'] = {
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
    get: 'shortcuts.folders.getFolder',
    list: 'shortcuts.folders.listFolders',
  },
}

const shortcutListOperation: OperationDescriptor<Record<string, never>, readonly Shortcut[]> = {
  id: 'shortcuts.shortcuts.list',
  permission: 'shortcuts:shortcuts:list',
  target: { command: 'list', resource: 'Shortcut' },
  description: 'List all shortcuts',
  input: t.record({}),
  output: t.array(shortcutRecordType),
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
}

const folderListFoldersOperation: OperationDescriptor<Record<string, never>, readonly Folder[]> = {
  id: 'shortcuts.folders.listFolders',
  permission: 'shortcuts:folders:list',
  target: { command: 'listFolders', resource: 'Folder' },
  description: 'List all folders',
  input: t.record({}),
  output: t.array(folderRecordType),
}

const folderGetFolderOperation: OperationDescriptor<{ readonly id: string }, Folder> = {
  id: 'shortcuts.folders.getFolder',
  permission: 'shortcuts:folders:get',
  target: { command: 'getFolder', resource: 'Folder' },
  description: 'Get a folder by ID',
  input: t.record({
    id: t.string({ description: 'Folder identifier' }),
  }),
  output: folderRecordType,
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ShortcutsClient>['operations'] = {
  'shortcuts.shortcuts.list': shortcutListOperation,
  'shortcuts.shortcuts.get': shortcutGetOperation,
  'shortcuts.shortcuts.run': shortcutRunOperation,
  'shortcuts.folders.listFolders': folderListFoldersOperation,
  'shortcuts.folders.getFolder': folderGetFolderOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ShortcutsClient {
  return {
    shortcuts: {
      list: (options) => runtime.invoke(shortcutListOperation, {}, options),
      get: (id, options) => runtime.invoke(shortcutGetOperation, { id }, options),
      run: (id, withInput, options) =>
        runtime.invoke(shortcutRunOperation, { id, withInput }, options),
    },
    folders: {
      list: (options) => runtime.invoke(folderListFoldersOperation, {}, options),
      get: (id, options) => runtime.invoke(folderGetFolderOperation, { id }, options),
    },
  }
}

/**
 * The Shortcuts contract. Pass it to a client factory to obtain a
 * {@link ShortcutsClient}.
 */
export const shortcutsContract: AppContract<ShortcutsClient> = {
  app: 'shortcuts',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

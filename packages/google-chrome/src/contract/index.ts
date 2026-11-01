/**
 * The Google Chrome contract: the transport-neutral description of every
 * Google Chrome operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `GoogleChromeClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `GoogleChromeClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { googleChromeContract } from '@macts/google-chrome/contract'
 *
 * const client = createClient(googleChromeContract, { token, url })
 * ```
 *
 * Generated from the Google Chrome manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileSource,
  type Integer,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Rectangle,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A window. */
export interface Window {
  /** The given name of the window. */
  givenName: string
  /** The full title of the window. */
  readonly name: string
  /** The unique identifier of the window. */
  readonly id: string
  /** The index of the window, ordered front to back. */
  index: Integer
  /** The bounding rectangle of the window. */
  bounds: Rectangle
  /** Whether the window has a close box. */
  readonly closeable: boolean
  /** Whether the window can be minimized. */
  readonly minimizable: boolean
  /** Whether the window is currently minimized. */
  minimized: boolean
  /** Whether the window can be resized. */
  readonly resizable: boolean
  /** Whether the window is currently visible. */
  visible: boolean
  /** Whether the window can be zoomed. */
  readonly zoomable: boolean
  /** Whether the window is currently zoomed. */
  zoomed: boolean
  /** Returns the currently selected tab */
  readonly activeTab: ObjectReferenceVariant<Tab, string>
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode: string
  /** The index of the active tab. */
  activeTabIndex: Integer
}

/** A tab. */
export interface Tab {
  /** Unique ID of the tab. */
  readonly id: string
  /** The title of the tab. */
  readonly title: string
  /** The url visible to the user. */
  uRL: string
  /** Is loading? */
  readonly loading: boolean
}

/** A bookmarks folder that contains other bookmarks folder and bookmark items. */
export interface BookmarkFolder {
  /** Unique ID of the bookmark folder. */
  readonly id: string
  /** The title of the folder. */
  title: string
  /** Returns the index with respect to its parent bookmark folder. */
  readonly index: number
}

/** An item consists of an URL and the title of a bookmark */
export interface BookmarkItem {
  /** Unique ID of the bookmark item. */
  readonly id: string
  /** The title of the bookmark item. */
  title: string
  /** The URL of the bookmark. */
  uRL: string
  /** Returns the index with respect to its parent bookmark folder. */
  readonly index: number
}

/** Input for creating a Window. */
export interface WindowCreateInput {
  /** The given name of the window. */
  givenName?: string
  /** The index of the window, ordered front to back. */
  index?: Integer
  /** The bounding rectangle of the window. */
  bounds?: Rectangle
  /** Whether the window is currently minimized. */
  minimized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode?: string
  /** The index of the active tab. */
  activeTabIndex?: Integer
}

/** Input for updating a Window. Omitted fields are left unchanged. */
export interface WindowUpdateInput {
  /** The given name of the window. */
  givenName?: string
  /** The index of the window, ordered front to back. */
  index?: Integer
  /** The bounding rectangle of the window. */
  bounds?: Rectangle
  /** Whether the window is currently minimized. */
  minimized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode?: string
  /** The index of the active tab. */
  activeTabIndex?: Integer
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The url visible to the user. */
  uRL?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** The url visible to the user. */
  uRL?: string
}

/** Input for creating a BookmarkFolder. */
export interface BookmarkFolderCreateInput {
  /** The title of the folder. */
  title?: string
}

/** Input for updating a BookmarkFolder. Omitted fields are left unchanged. */
export interface BookmarkFolderUpdateInput {
  /** The title of the folder. */
  title?: string
}

/** Input for creating a BookmarkItem. */
export interface BookmarkItemCreateInput {
  /** The title of the bookmark item. */
  title?: string
  /** The URL of the bookmark. */
  uRL?: string
}

/** Input for updating a BookmarkItem. Omitted fields are left unchanged. */
export interface BookmarkItemUpdateInput {
  /** The title of the bookmark item. */
  title?: string
  /** The URL of the bookmark. */
  uRL?: string
}

/**
 * The Google Chrome client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link googleChromeContract}.
 */
export interface GoogleChromeClient {
  /** Save an object. */
  save(_in?: FileSource, as?: string, options?: CallOptions): Promise<void>
  /** Open a document. */
  open(options?: CallOptions): Promise<void>
  /** Close a window. */
  close(options?: CallOptions): Promise<void>
  /** Quit the application. */
  quit(options?: CallOptions): Promise<void>
  /** Return the number of elements of a particular class within an object. */
  count(each?: string, options?: CallOptions): Promise<void>
  /** Delete an object. */
  _delete(options?: CallOptions): Promise<void>
  /** Copy object(s) and put the copies at a new location. */
  duplicate(to?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Verify if an object exists. */
  exists(options?: CallOptions): Promise<void>
  /** Make a new object. */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /** Move object(s) to a new location. */
  move(to: string, options?: CallOptions): Promise<void>
  /** Print an object. */
  print(options?: CallOptions): Promise<void>
  /** Reload a tab. */
  reload(options?: CallOptions): Promise<void>
  /** Go Back (If Possible). */
  goBack(options?: CallOptions): Promise<void>
  /** Go Forward (If Possible). */
  goForward(options?: CallOptions): Promise<void>
  /** Select all. */
  selectAll(options?: CallOptions): Promise<void>
  /** Cut selected text (If Possible). */
  cutSelection(options?: CallOptions): Promise<void>
  /** Copy text. */
  copySelection(options?: CallOptions): Promise<void>
  /** Paste text (If Possible). */
  pasteSelection(options?: CallOptions): Promise<void>
  /** Undo the last change. */
  undo(options?: CallOptions): Promise<void>
  /** Redo the last change. */
  redo(options?: CallOptions): Promise<void>
  /** Stop the current tab from loading. */
  stop(options?: CallOptions): Promise<void>
  /** View the HTML source of the tab. */
  viewSource(options?: CallOptions): Promise<void>
  /** Execute a piece of javascript. */
  execute(javascript: string, options?: CallOptions): Promise<void>
}

const windowRecordType: ValueType<Window> = t.record(
  {
    givenName: t.string({ description: 'The given name of the window.' }),
    name: t.string({ description: 'The full title of the window.' }),
    id: t.string({ description: 'The unique identifier of the window.' }),
    index: t.integer({ description: 'The index of the window, ordered front to back.' }),
    bounds: t.rectangle({ description: 'The bounding rectangle of the window.' }),
    closeable: t.boolean({ description: 'Whether the window has a close box.' }),
    minimizable: t.boolean({ description: 'Whether the window can be minimized.' }),
    minimized: t.boolean({ description: 'Whether the window is currently minimized.' }),
    resizable: t.boolean({ description: 'Whether the window can be resized.' }),
    visible: t.boolean({ description: 'Whether the window is currently visible.' }),
    zoomable: t.boolean({ description: 'Whether the window can be zoomed.' }),
    zoomed: t.boolean({ description: 'Whether the window is currently zoomed.' }),
    activeTab: t.reference<Tab, string>(() => resources, 'Tab', 'one', {
      description: 'Returns the currently selected tab',
    }),
    mode: t.string({
      description:
        "Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window.",
    }),
    activeTabIndex: t.integer({ description: 'The index of the active tab.' }),
  },
  { description: 'A window.' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    id: t.string({ description: 'Unique ID of the tab.' }),
    title: t.string({ description: 'The title of the tab.' }),
    uRL: t.string({ description: 'The url visible to the user.' }),
    loading: t.boolean({ description: 'Is loading?' }),
  },
  { description: 'A tab.' }
)

const bookmarkFolderRecordType: ValueType<BookmarkFolder> = t.record(
  {
    id: t.string({ description: 'Unique ID of the bookmark folder.' }),
    title: t.string({ description: 'The title of the folder.' }),
    index: t.double({
      description: 'Returns the index with respect to its parent bookmark folder.',
    }),
  },
  { description: 'A bookmarks folder that contains other bookmarks folder and bookmark items.' }
)

const bookmarkItemRecordType: ValueType<BookmarkItem> = t.record(
  {
    id: t.string({ description: 'Unique ID of the bookmark item.' }),
    title: t.string({ description: 'The title of the bookmark item.' }),
    uRL: t.string({ description: 'The URL of the bookmark.' }),
    index: t.double({
      description: 'Returns the index with respect to its parent bookmark folder.',
    }),
  },
  { description: 'An item consists of an URL and the title of a bookmark' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<GoogleChromeClient>['resources'] = {
  Window: {
    name: 'Window',
    record: windowRecordType,
    id: t.string({ description: 'The unique identifier of the window.' }),
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
    id: t.string({ description: 'Unique ID of the tab.' }),
  },
  BookmarkFolder: {
    name: 'BookmarkFolder',
    record: bookmarkFolderRecordType,
    id: t.string({ description: 'Unique ID of the bookmark folder.' }),
  },
  BookmarkItem: {
    name: 'BookmarkItem',
    record: bookmarkItemRecordType,
    id: t.string({ description: 'Unique ID of the bookmark item.' }),
  },
}

const appSaveOperation: OperationDescriptor<
  { readonly in?: FileSource | undefined; readonly as?: string | undefined },
  undefined
> = {
  id: 'google-chrome.app.save',
  permission: 'google-chrome:app:save',
  target: { command: 'save' },
  description: 'Save an object.',
  input: t.record({
    in: t.optional(t.fileSource({ description: 'The file in which to save the object.' })),
    as: t.optional(
      t.string({
        description:
          "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'.",
      })
    ),
  }),
  output: t.none(),
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.open',
  permission: 'google-chrome:app:open',
  target: { command: 'open' },
  description: 'Open a document.',
  input: t.record({}),
  output: t.none(),
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.close',
  permission: 'google-chrome:app:close',
  target: { command: 'close' },
  description: 'Close a window.',
  input: t.record({}),
  output: t.none(),
}

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.quit',
  permission: 'google-chrome:app:quit',
  target: { command: 'quit' },
  description: 'Quit the application.',
  input: t.record({}),
  output: t.none(),
}

const appCountOperation: OperationDescriptor<{ readonly each?: string | undefined }, undefined> = {
  id: 'google-chrome.app.count',
  permission: 'google-chrome:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object.',
  input: t.record({
    each: t.optional(t.string({ description: 'The class of objects to be counted.' })),
  }),
  output: t.none(),
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.delete',
  permission: 'google-chrome:app:delete',
  target: { command: 'delete' },
  description: 'Delete an object.',
  input: t.record({}),
  output: t.none(),
}

const appDuplicateOperation: OperationDescriptor<
  { readonly to?: string | undefined; readonly withProperties?: unknown },
  undefined
> = {
  id: 'google-chrome.app.duplicate',
  permission: 'google-chrome:app:duplicate',
  target: { command: 'duplicate' },
  description: 'Copy object(s) and put the copies at a new location.',
  input: t.record({
    to: t.optional(t.string({ description: 'The location for the new object(s).' })),
    withProperties: t.optional(
      t.unknown({ description: 'Properties to be set in the new duplicated object(s).' })
    ),
  }),
  output: t.none(),
}

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.exists',
  permission: 'google-chrome:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists.',
  input: t.record({}),
  output: t.none(),
}

const appMakeOperation: OperationDescriptor<
  {
    readonly new: string
    readonly at?: string | undefined
    readonly withData?: unknown
    readonly withProperties?: unknown
  },
  undefined
> = {
  id: 'google-chrome.app.make',
  permission: 'google-chrome:app:make',
  target: { command: 'make' },
  description: 'Make a new object.',
  input: t.record({
    new: t.string({ description: 'The class of the new object.' }),
    at: t.optional(t.string({ description: 'The location at which to insert the object.' })),
    withData: t.optional(t.unknown({ description: 'The initial contents of the object.' })),
    withProperties: t.optional(
      t.unknown({ description: 'The initial values for properties of the object.' })
    ),
  }),
  output: t.none(),
}

const appMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'google-chrome.app.move',
  permission: 'google-chrome:app:move',
  target: { command: 'move' },
  description: 'Move object(s) to a new location.',
  input: t.record({
    to: t.string({ description: 'The new location for the object(s).' }),
  }),
  output: t.none(),
}

const appPrintOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.print',
  permission: 'google-chrome:app:print',
  target: { command: 'print' },
  description: 'Print an object.',
  input: t.record({}),
  output: t.none(),
}

const appReloadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.reload',
  permission: 'google-chrome:app:reload',
  target: { command: 'reload' },
  description: 'Reload a tab.',
  input: t.record({}),
  output: t.none(),
}

const appGoBackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.goBack',
  permission: 'google-chrome:app:goBack',
  target: { command: 'goBack' },
  description: 'Go Back (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appGoForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.goForward',
  permission: 'google-chrome:app:goForward',
  target: { command: 'goForward' },
  description: 'Go Forward (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appSelectAllOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.selectAll',
  permission: 'google-chrome:app:selectAll',
  target: { command: 'selectAll' },
  description: 'Select all.',
  input: t.record({}),
  output: t.none(),
}

const appCutSelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.cutSelection',
  permission: 'google-chrome:app:cutSelection',
  target: { command: 'cutSelection' },
  description: 'Cut selected text (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appCopySelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.copySelection',
  permission: 'google-chrome:app:copySelection',
  target: { command: 'copySelection' },
  description: 'Copy text.',
  input: t.record({}),
  output: t.none(),
}

const appPasteSelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.pasteSelection',
  permission: 'google-chrome:app:pasteSelection',
  target: { command: 'pasteSelection' },
  description: 'Paste text (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.undo',
  permission: 'google-chrome:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last change.',
  input: t.record({}),
  output: t.none(),
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.redo',
  permission: 'google-chrome:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last change.',
  input: t.record({}),
  output: t.none(),
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.stop',
  permission: 'google-chrome:app:stop',
  target: { command: 'stop' },
  description: 'Stop the current tab from loading.',
  input: t.record({}),
  output: t.none(),
}

const appViewSourceOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.viewSource',
  permission: 'google-chrome:app:viewSource',
  target: { command: 'viewSource' },
  description: 'View the HTML source of the tab.',
  input: t.record({}),
  output: t.none(),
}

const appExecuteOperation: OperationDescriptor<{ readonly javascript: string }, undefined> = {
  id: 'google-chrome.app.execute',
  permission: 'google-chrome:app:execute',
  target: { command: 'execute' },
  description: 'Execute a piece of javascript.',
  input: t.record({
    javascript: t.string({ description: 'The javascript code to execute.' }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<GoogleChromeClient>['operations'] = {
  'google-chrome.app.save': appSaveOperation,
  'google-chrome.app.open': appOpenOperation,
  'google-chrome.app.close': appCloseOperation,
  'google-chrome.app.quit': appQuitOperation,
  'google-chrome.app.count': appCountOperation,
  'google-chrome.app.delete': appDeleteOperation,
  'google-chrome.app.duplicate': appDuplicateOperation,
  'google-chrome.app.exists': appExistsOperation,
  'google-chrome.app.make': appMakeOperation,
  'google-chrome.app.move': appMoveOperation,
  'google-chrome.app.print': appPrintOperation,
  'google-chrome.app.reload': appReloadOperation,
  'google-chrome.app.goBack': appGoBackOperation,
  'google-chrome.app.goForward': appGoForwardOperation,
  'google-chrome.app.selectAll': appSelectAllOperation,
  'google-chrome.app.cutSelection': appCutSelectionOperation,
  'google-chrome.app.copySelection': appCopySelectionOperation,
  'google-chrome.app.pasteSelection': appPasteSelectionOperation,
  'google-chrome.app.undo': appUndoOperation,
  'google-chrome.app.redo': appRedoOperation,
  'google-chrome.app.stop': appStopOperation,
  'google-chrome.app.viewSource': appViewSourceOperation,
  'google-chrome.app.execute': appExecuteOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): GoogleChromeClient {
  return {
    save: (_in, as, options) => runtime.invoke(appSaveOperation, { in: _in, as }, options),
    open: (options) => runtime.invoke(appOpenOperation, {}, options),
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    quit: (options) => runtime.invoke(appQuitOperation, {}, options),
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    _delete: (options) => runtime.invoke(appDeleteOperation, {}, options),
    duplicate: (to, withProperties, options) =>
      runtime.invoke(appDuplicateOperation, { to, withProperties }, options),
    exists: (options) => runtime.invoke(appExistsOperation, {}, options),
    make: (_new, at, withData, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, at, withData, withProperties }, options),
    move: (to, options) => runtime.invoke(appMoveOperation, { to }, options),
    print: (options) => runtime.invoke(appPrintOperation, {}, options),
    reload: (options) => runtime.invoke(appReloadOperation, {}, options),
    goBack: (options) => runtime.invoke(appGoBackOperation, {}, options),
    goForward: (options) => runtime.invoke(appGoForwardOperation, {}, options),
    selectAll: (options) => runtime.invoke(appSelectAllOperation, {}, options),
    cutSelection: (options) => runtime.invoke(appCutSelectionOperation, {}, options),
    copySelection: (options) => runtime.invoke(appCopySelectionOperation, {}, options),
    pasteSelection: (options) => runtime.invoke(appPasteSelectionOperation, {}, options),
    undo: (options) => runtime.invoke(appUndoOperation, {}, options),
    redo: (options) => runtime.invoke(appRedoOperation, {}, options),
    stop: (options) => runtime.invoke(appStopOperation, {}, options),
    viewSource: (options) => runtime.invoke(appViewSourceOperation, {}, options),
    execute: (javascript, options) => runtime.invoke(appExecuteOperation, { javascript }, options),
  }
}

/**
 * The Google Chrome contract. Pass it to a client factory to obtain a
 * {@link GoogleChromeClient}.
 */
export const googleChromeContract: AppContract<GoogleChromeClient> = {
  app: 'google-chrome',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

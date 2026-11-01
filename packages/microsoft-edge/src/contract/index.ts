/**
 * The Microsoft Edge contract: the transport-neutral description of every
 * Microsoft Edge operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `MicrosoftEdgeClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `MicrosoftEdgeClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Microsoft Edge manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
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
  /** Window mode (normal or incognito) */
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
  /** Window mode (normal or incognito) */
  mode?: string
  /** The index of the active tab. */
  activeTabIndex?: Integer
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** URL to load in the tab */
  uRL?: string
  /** Window identifier for the tab */
  windowId: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** URL to load in the tab */
  uRL?: string
  /** Window identifier for the tab */
  windowId?: string
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

/** A window. */
export interface WindowResourceClient {
  /** List windows. */
  list(options?: CallOptions): Promise<readonly Window[]>
  /** Read the window identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Window>
  /** Create a window. */
  create(input: WindowCreateInput, options?: CallOptions): Promise<Window>
}

/** A tab. */
export interface TabResourceClient {
  /** List tabs. */
  list(windowId: string, options?: CallOptions): Promise<readonly Tab[]>
  /** Read the tab identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Tab>
  /** Create a tab. */
  create(input: TabCreateInput, options?: CallOptions): Promise<Tab>
  /** Reload a tab */
  reload(tabId: string, options?: CallOptions): Promise<void>
  /** Go Back (If Possible) */
  goBack(tabId: string, options?: CallOptions): Promise<void>
  /** Go Forward (If Possible) */
  goForward(tabId: string, options?: CallOptions): Promise<void>
  /** Select all */
  selectAll(tabId: string, options?: CallOptions): Promise<void>
  /** Cut selected text (If Possible) */
  cutSelection(tabId: string, options?: CallOptions): Promise<void>
  /** Copy text */
  copySelection(tabId: string, options?: CallOptions): Promise<void>
  /** Paste text (If Possible) */
  pasteSelection(tabId: string, options?: CallOptions): Promise<void>
  /** Undo the last change */
  undo(tabId: string, options?: CallOptions): Promise<void>
  /** Redo the last change */
  redo(tabId: string, options?: CallOptions): Promise<void>
  /** Stop the current tab from loading */
  stop(tabId: string, options?: CallOptions): Promise<void>
  /** View the HTML source of the tab */
  viewSource(tabId: string, options?: CallOptions): Promise<void>
  /** Execute a piece of javascript */
  execute(tabId: string, javascript: string, options?: CallOptions): Promise<void>
}

/** A bookmarks folder that contains other bookmarks folder and bookmark items. */
export interface BookmarkFolderResourceClient {
  /** List bookmarkfolders. */
  list(options?: CallOptions): Promise<readonly BookmarkFolder[]>
  /** Read the bookmarkfolder identified by `id`. */
  get(id: string, options?: CallOptions): Promise<BookmarkFolder>
}

/** An item consists of an URL and the title of a bookmark */
export interface BookmarkItemResourceClient {
  /** List bookmarkitems. */
  list(folderId: string, options?: CallOptions): Promise<readonly BookmarkItem[]>
  /** Read the bookmarkitem identified by `id`. */
  get(id: string, options?: CallOptions): Promise<BookmarkItem>
}

/**
 * The Microsoft Edge client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link microsoftEdgeContract}.
 */
export interface MicrosoftEdgeClient {
  /** A window. */
  readonly windows: WindowResourceClient
  /** A tab. */
  readonly tabs: TabResourceClient
  /** A bookmarks folder that contains other bookmarks folder and bookmark items. */
  readonly bookmarkfolders: BookmarkFolderResourceClient
  /** An item consists of an URL and the title of a bookmark */
  readonly bookmarkitems: BookmarkItemResourceClient
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

const windowCreateInputType: ValueType<WindowCreateInput> = t.record({
  givenName: t.optional(t.string({ description: 'The given name of the window.' })),
  index: t.optional(t.integer({ description: 'The index of the window, ordered front to back.' })),
  bounds: t.optional(t.rectangle({ description: 'The bounding rectangle of the window.' })),
  minimized: t.optional(t.boolean({ description: 'Whether the window is currently minimized.' })),
  visible: t.optional(t.boolean({ description: 'Whether the window is currently visible.' })),
  zoomed: t.optional(t.boolean({ description: 'Whether the window is currently zoomed.' })),
  mode: t.optional(t.string({ description: 'Window mode (normal or incognito)' })),
  activeTabIndex: t.optional(t.integer({ description: 'The index of the active tab.' })),
})

const tabCreateInputType: ValueType<TabCreateInput> = t.record({
  uRL: t.optional(t.string({ description: 'URL to load in the tab' })),
  windowId: t.string({ description: 'Window identifier for the tab' }),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<MicrosoftEdgeClient>['resources'] = {
  Window: {
    name: 'Window',
    record: windowRecordType,
    id: t.string({ description: 'The unique identifier of the window.' }),
    get: 'microsoft-edge.windows.getWindow',
    list: 'microsoft-edge.windows.listWindows',
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
    id: t.string({ description: 'Unique ID of the tab.' }),
    get: 'microsoft-edge.tabs.getTab',
    list: 'microsoft-edge.tabs.listTabs',
  },
  BookmarkFolder: {
    name: 'BookmarkFolder',
    record: bookmarkFolderRecordType,
    id: t.string({ description: 'Unique ID of the bookmark folder.' }),
    get: 'microsoft-edge.bookmarkfolders.getBookmarkFolder',
    list: 'microsoft-edge.bookmarkfolders.listBookmarkFolders',
  },
  BookmarkItem: {
    name: 'BookmarkItem',
    record: bookmarkItemRecordType,
    id: t.string({ description: 'Unique ID of the bookmark item.' }),
    get: 'microsoft-edge.bookmarkitems.getBookmarkItem',
    list: 'microsoft-edge.bookmarkitems.listBookmarkItems',
  },
}

const windowListWindowsOperation: OperationDescriptor<Record<string, never>, readonly Window[]> = {
  id: 'microsoft-edge.windows.listWindows',
  permission: 'edge:windows:list',
  target: { command: 'listWindows', resource: 'Window' },
  description: 'List all windows',
  input: t.record({}),
  output: t.array(windowRecordType),
}

const windowGetWindowOperation: OperationDescriptor<{ readonly id: string }, Window> = {
  id: 'microsoft-edge.windows.getWindow',
  permission: 'edge:windows:get',
  target: { command: 'getWindow', resource: 'Window' },
  description: 'Get a window by ID',
  input: t.record({
    id: t.string({ description: 'Window identifier' }),
  }),
  output: windowRecordType,
}

const windowCreateWindowOperation: OperationDescriptor<WindowCreateInput, Window> = {
  id: 'microsoft-edge.windows.createWindow',
  permission: 'edge:windows:create',
  target: { command: 'createWindow', resource: 'Window' },
  description: 'Create a new window',
  input: windowCreateInputType,
  output: windowRecordType,
}

const tabListTabsOperation: OperationDescriptor<{ readonly windowId: string }, readonly Tab[]> = {
  id: 'microsoft-edge.tabs.listTabs',
  permission: 'edge:tabs:list',
  target: { command: 'listTabs', resource: 'Tab' },
  description: 'List all tabs in a window',
  input: t.record({
    windowId: t.string({ description: 'Window identifier' }),
  }),
  output: t.array(tabRecordType),
}

const tabGetTabOperation: OperationDescriptor<{ readonly id: string }, Tab> = {
  id: 'microsoft-edge.tabs.getTab',
  permission: 'edge:tabs:get',
  target: { command: 'getTab', resource: 'Tab' },
  description: 'Get a tab by ID',
  input: t.record({
    id: t.string({ description: 'Tab identifier' }),
  }),
  output: tabRecordType,
}

const tabCreateTabOperation: OperationDescriptor<TabCreateInput, Tab> = {
  id: 'microsoft-edge.tabs.createTab',
  permission: 'edge:tabs:create',
  target: { command: 'createTab', resource: 'Tab' },
  description: 'Create a new tab',
  input: tabCreateInputType,
  output: tabRecordType,
}

const bookmarkFolderListBookmarkFoldersOperation: OperationDescriptor<
  Record<string, never>,
  readonly BookmarkFolder[]
> = {
  id: 'microsoft-edge.bookmarkfolders.listBookmarkFolders',
  permission: 'edge:bookmarkFolders:list',
  target: { command: 'listBookmarkFolders', resource: 'BookmarkFolder' },
  description: 'List all bookmark folders',
  input: t.record({}),
  output: t.array(bookmarkFolderRecordType),
}

const bookmarkFolderGetBookmarkFolderOperation: OperationDescriptor<
  { readonly id: string },
  BookmarkFolder
> = {
  id: 'microsoft-edge.bookmarkfolders.getBookmarkFolder',
  permission: 'edge:bookmarkFolders:get',
  target: { command: 'getBookmarkFolder', resource: 'BookmarkFolder' },
  description: 'Get a bookmark folder by ID',
  input: t.record({
    id: t.string({ description: 'Bookmark folder identifier' }),
  }),
  output: bookmarkFolderRecordType,
}

const bookmarkItemListBookmarkItemsOperation: OperationDescriptor<
  { readonly folderId: string },
  readonly BookmarkItem[]
> = {
  id: 'microsoft-edge.bookmarkitems.listBookmarkItems',
  permission: 'edge:bookmarkItems:list',
  target: { command: 'listBookmarkItems', resource: 'BookmarkItem' },
  description: 'List all bookmark items in a folder',
  input: t.record({
    folderId: t.string({ description: 'Bookmark folder identifier' }),
  }),
  output: t.array(bookmarkItemRecordType),
}

const bookmarkItemGetBookmarkItemOperation: OperationDescriptor<
  { readonly id: string },
  BookmarkItem
> = {
  id: 'microsoft-edge.bookmarkitems.getBookmarkItem',
  permission: 'edge:bookmarkItems:get',
  target: { command: 'getBookmarkItem', resource: 'BookmarkItem' },
  description: 'Get a bookmark item by ID',
  input: t.record({
    id: t.string({ description: 'Bookmark item identifier' }),
  }),
  output: bookmarkItemRecordType,
}

const tabReloadOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.reload',
  permission: 'edge:tabs:reload',
  target: { command: 'reload', resource: 'Tab' },
  description: 'Reload a tab',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabGoBackOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.goBack',
  permission: 'edge:tabs:goBack',
  target: { command: 'goBack', resource: 'Tab' },
  description: 'Go Back (If Possible)',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabGoForwardOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.goForward',
  permission: 'edge:tabs:goForward',
  target: { command: 'goForward', resource: 'Tab' },
  description: 'Go Forward (If Possible)',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabSelectAllOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.selectAll',
  permission: 'edge:tabs:selectAll',
  target: { command: 'selectAll', resource: 'Tab' },
  description: 'Select all',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabCutSelectionOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.cutSelection',
  permission: 'edge:tabs:cutSelection',
  target: { command: 'cutSelection', resource: 'Tab' },
  description: 'Cut selected text (If Possible)',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabCopySelectionOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.copySelection',
  permission: 'edge:tabs:copySelection',
  target: { command: 'copySelection', resource: 'Tab' },
  description: 'Copy text',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabPasteSelectionOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.pasteSelection',
  permission: 'edge:tabs:pasteSelection',
  target: { command: 'pasteSelection', resource: 'Tab' },
  description: 'Paste text (If Possible)',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabUndoOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.undo',
  permission: 'edge:tabs:undo',
  target: { command: 'undo', resource: 'Tab' },
  description: 'Undo the last change',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabRedoOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.redo',
  permission: 'edge:tabs:redo',
  target: { command: 'redo', resource: 'Tab' },
  description: 'Redo the last change',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabStopOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.stop',
  permission: 'edge:tabs:stop',
  target: { command: 'stop', resource: 'Tab' },
  description: 'Stop the current tab from loading',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabViewSourceOperation: OperationDescriptor<{ readonly tabId: string }, undefined> = {
  id: 'microsoft-edge.tabs.viewSource',
  permission: 'edge:tabs:viewSource',
  target: { command: 'viewSource', resource: 'Tab' },
  description: 'View the HTML source of the tab',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
  }),
  output: t.none(),
}

const tabExecuteOperation: OperationDescriptor<
  { readonly tabId: string; readonly javascript: string },
  undefined
> = {
  id: 'microsoft-edge.tabs.execute',
  permission: 'edge:tabs:execute',
  target: { command: 'execute', resource: 'Tab' },
  description: 'Execute a piece of javascript',
  input: t.record({
    tabId: t.string({ description: 'Tab identifier' }),
    javascript: t.string({ description: 'The javascript code to execute' }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<MicrosoftEdgeClient>['operations'] = {
  'microsoft-edge.windows.listWindows': windowListWindowsOperation,
  'microsoft-edge.windows.getWindow': windowGetWindowOperation,
  'microsoft-edge.windows.createWindow': windowCreateWindowOperation,
  'microsoft-edge.tabs.listTabs': tabListTabsOperation,
  'microsoft-edge.tabs.getTab': tabGetTabOperation,
  'microsoft-edge.tabs.createTab': tabCreateTabOperation,
  'microsoft-edge.bookmarkfolders.listBookmarkFolders': bookmarkFolderListBookmarkFoldersOperation,
  'microsoft-edge.bookmarkfolders.getBookmarkFolder': bookmarkFolderGetBookmarkFolderOperation,
  'microsoft-edge.bookmarkitems.listBookmarkItems': bookmarkItemListBookmarkItemsOperation,
  'microsoft-edge.bookmarkitems.getBookmarkItem': bookmarkItemGetBookmarkItemOperation,
  'microsoft-edge.tabs.reload': tabReloadOperation,
  'microsoft-edge.tabs.goBack': tabGoBackOperation,
  'microsoft-edge.tabs.goForward': tabGoForwardOperation,
  'microsoft-edge.tabs.selectAll': tabSelectAllOperation,
  'microsoft-edge.tabs.cutSelection': tabCutSelectionOperation,
  'microsoft-edge.tabs.copySelection': tabCopySelectionOperation,
  'microsoft-edge.tabs.pasteSelection': tabPasteSelectionOperation,
  'microsoft-edge.tabs.undo': tabUndoOperation,
  'microsoft-edge.tabs.redo': tabRedoOperation,
  'microsoft-edge.tabs.stop': tabStopOperation,
  'microsoft-edge.tabs.viewSource': tabViewSourceOperation,
  'microsoft-edge.tabs.execute': tabExecuteOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): MicrosoftEdgeClient {
  return {
    windows: {
      list: (options) => runtime.invoke(windowListWindowsOperation, {}, options),
      get: (id, options) => runtime.invoke(windowGetWindowOperation, { id }, options),
      create: (input, options) => runtime.invoke(windowCreateWindowOperation, input, options),
    },
    tabs: {
      list: (windowId, options) => runtime.invoke(tabListTabsOperation, { windowId }, options),
      get: (id, options) => runtime.invoke(tabGetTabOperation, { id }, options),
      create: (input, options) => runtime.invoke(tabCreateTabOperation, input, options),
      reload: (tabId, options) => runtime.invoke(tabReloadOperation, { tabId }, options),
      goBack: (tabId, options) => runtime.invoke(tabGoBackOperation, { tabId }, options),
      goForward: (tabId, options) => runtime.invoke(tabGoForwardOperation, { tabId }, options),
      selectAll: (tabId, options) => runtime.invoke(tabSelectAllOperation, { tabId }, options),
      cutSelection: (tabId, options) =>
        runtime.invoke(tabCutSelectionOperation, { tabId }, options),
      copySelection: (tabId, options) =>
        runtime.invoke(tabCopySelectionOperation, { tabId }, options),
      pasteSelection: (tabId, options) =>
        runtime.invoke(tabPasteSelectionOperation, { tabId }, options),
      undo: (tabId, options) => runtime.invoke(tabUndoOperation, { tabId }, options),
      redo: (tabId, options) => runtime.invoke(tabRedoOperation, { tabId }, options),
      stop: (tabId, options) => runtime.invoke(tabStopOperation, { tabId }, options),
      viewSource: (tabId, options) => runtime.invoke(tabViewSourceOperation, { tabId }, options),
      execute: (tabId, javascript, options) =>
        runtime.invoke(tabExecuteOperation, { tabId, javascript }, options),
    },
    bookmarkfolders: {
      list: (options) => runtime.invoke(bookmarkFolderListBookmarkFoldersOperation, {}, options),
      get: (id, options) =>
        runtime.invoke(bookmarkFolderGetBookmarkFolderOperation, { id }, options),
    },
    bookmarkitems: {
      list: (folderId, options) =>
        runtime.invoke(bookmarkItemListBookmarkItemsOperation, { folderId }, options),
      get: (id, options) => runtime.invoke(bookmarkItemGetBookmarkItemOperation, { id }, options),
    },
  }
}

/**
 * The Microsoft Edge contract. Pass it to a client factory to obtain a
 * {@link MicrosoftEdgeClient}.
 */
export const microsoftEdgeContract: AppContract<MicrosoftEdgeClient> = {
  app: 'microsoft-edge',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

/**
 * The Terminal contract: the transport-neutral description of every
 * Terminal operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `TerminalClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `TerminalClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Terminal manifest; do not edit.
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

/** A Terminal window */
export interface Window {
  /** The title of the window */
  readonly name: string
  /** The unique identifier of the window */
  readonly id: number
  /** The position of the window */
  position: string
  /** Whether the window is visible */
  visible: boolean
  /** Whether the window is the frontmost window */
  readonly frontmost: boolean
}

/** A Terminal tab */
export interface Tab {
  /** The visible contents of the tab */
  readonly contents: string
  /** The complete history contents of the tab */
  readonly history: string
  /** Whether the tab is busy running a process */
  readonly busy: boolean
  /** The currently running processes in the tab */
  readonly processes: string
  /** Whether the tab is selected */
  selected: boolean
  /** Whether the title displays a custom title */
  titleDisplaysCustomTitle: boolean
  /** The custom title of the tab */
  customTitle: string
  /** The tty device of the tab */
  readonly tty: string
  /** The name of the current settings set */
  currentSettings: string
}

/** A Terminal settings set (profile) */
export interface SettingsSet {
  /** The name of the settings set */
  name: string
  /** The unique identifier of the settings set */
  readonly id: number
  /** The number of rows */
  numberOfRows: number
  /** The number of columns */
  numberOfColumns: number
  /** The name of the font */
  fontName: string
  /** The size of the font */
  fontSize: number
}

/** Input for creating a Window. */
export interface WindowCreateInput {
  /** The position of the window */
  position?: string
  /** Whether the window is visible */
  visible?: boolean
}

/** Input for updating a Window. Omitted fields are left unchanged. */
export interface WindowUpdateInput {
  /** The position of the window */
  position?: string
  /** Whether the window is visible */
  visible?: boolean
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** Whether the tab is selected */
  selected?: boolean
  /** Whether the title displays a custom title */
  titleDisplaysCustomTitle?: boolean
  /** The custom title of the tab */
  customTitle?: string
  /** The name of the current settings set */
  currentSettings?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** Whether the tab is selected */
  selected?: boolean
  /** Whether the title displays a custom title */
  titleDisplaysCustomTitle?: boolean
  /** The custom title of the tab */
  customTitle?: string
  /** The name of the current settings set */
  currentSettings?: string
}

/** Input for creating a SettingsSet. */
export interface SettingsSetCreateInput {
  /** The name of the settings set */
  name?: string
  /** The number of rows */
  numberOfRows?: number
  /** The number of columns */
  numberOfColumns?: number
  /** The name of the font */
  fontName?: string
  /** The size of the font */
  fontSize?: number
}

/** Input for updating a SettingsSet. Omitted fields are left unchanged. */
export interface SettingsSetUpdateInput {
  /** The name of the settings set */
  name?: string
  /** The number of rows */
  numberOfRows?: number
  /** The number of columns */
  numberOfColumns?: number
  /** The name of the font */
  fontName?: string
  /** The size of the font */
  fontSize?: number
}

/** A Terminal window */
export interface WindowResourceClient {
  /** List windows. */
  list(options?: CallOptions): Promise<readonly Window[]>
  /** Read the window identified by `name`. */
  get(name: string, options?: CallOptions): Promise<Window>
}

/** A Terminal tab */
export interface TabResourceClient {
  /** List tabs. */
  list(options?: CallOptions): Promise<readonly Tab[]>
  /** Read the tab identified by `name`. */
  get(name: string, options?: CallOptions): Promise<Tab>
}

/** A Terminal settings set (profile) */
export interface SettingsSetResourceClient {
  /** List settingssets. */
  list(options?: CallOptions): Promise<readonly SettingsSet[]>
  /** Read the settingsset identified by `name`. */
  get(name: string, options?: CallOptions): Promise<SettingsSet>
}

/**
 * The Terminal client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link terminalContract}.
 */
export interface TerminalClient {
  /** A Terminal window */
  readonly windows: WindowResourceClient
  /** A Terminal tab */
  readonly tabs: TabResourceClient
  /** A Terminal settings set (profile) */
  readonly settingssets: SettingsSetResourceClient
  /** Execute a shell command in a Terminal window or tab */
  doScript(command: string, _in?: string, options?: CallOptions): Promise<void>
}

const windowRecordType: ValueType<Window> = t.record(
  {
    name: t.string({ description: 'The title of the window' }),
    id: t.double({ description: 'The unique identifier of the window' }),
    position: t.string({ description: 'The position of the window' }),
    visible: t.boolean({ description: 'Whether the window is visible' }),
    frontmost: t.boolean({ description: 'Whether the window is the frontmost window' }),
  },
  { description: 'A Terminal window' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    contents: t.string({ description: 'The visible contents of the tab' }),
    history: t.string({ description: 'The complete history contents of the tab' }),
    busy: t.boolean({ description: 'Whether the tab is busy running a process' }),
    processes: t.string({ description: 'The currently running processes in the tab' }),
    selected: t.boolean({ description: 'Whether the tab is selected' }),
    titleDisplaysCustomTitle: t.boolean({
      description: 'Whether the title displays a custom title',
    }),
    customTitle: t.string({ description: 'The custom title of the tab' }),
    tty: t.string({ description: 'The tty device of the tab' }),
    currentSettings: t.string({ description: 'The name of the current settings set' }),
  },
  { description: 'A Terminal tab' }
)

const settingsSetRecordType: ValueType<SettingsSet> = t.record(
  {
    name: t.string({ description: 'The name of the settings set' }),
    id: t.double({ description: 'The unique identifier of the settings set' }),
    numberOfRows: t.double({ description: 'The number of rows' }),
    numberOfColumns: t.double({ description: 'The number of columns' }),
    fontName: t.string({ description: 'The name of the font' }),
    fontSize: t.double({ description: 'The size of the font' }),
  },
  { description: 'A Terminal settings set (profile)' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<TerminalClient>['resources'] = {
  Window: {
    name: 'Window',
    record: windowRecordType,
    id: t.string({ description: 'The title of the window' }),
    get: 'terminal.windows.get',
    list: 'terminal.windows.list',
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
    id: t.string({ description: 'The tty device of the tab' }),
    get: 'terminal.tabs.get',
    list: 'terminal.tabs.list',
  },
  SettingsSet: {
    name: 'SettingsSet',
    record: settingsSetRecordType,
    id: t.string({ description: 'The name of the settings set' }),
    get: 'terminal.settingssets.get',
    list: 'terminal.settingssets.list',
  },
}

const windowListOperation: OperationDescriptor<Record<string, never>, readonly Window[]> = {
  id: 'terminal.windows.list',
  permission: 'terminal:windows:list',
  target: { command: 'list', resource: 'Window' },
  description: 'List items',
  input: t.record({}),
  output: t.array(windowRecordType),
}

const tabListOperation: OperationDescriptor<Record<string, never>, readonly Tab[]> = {
  id: 'terminal.tabs.list',
  permission: 'terminal:tabs:list',
  target: { command: 'list', resource: 'Tab' },
  description: 'List items',
  input: t.record({}),
  output: t.array(tabRecordType),
}

const settingsSetListOperation: OperationDescriptor<
  Record<string, never>,
  readonly SettingsSet[]
> = {
  id: 'terminal.settingssets.list',
  permission: 'terminal:settingssets:list',
  target: { command: 'list', resource: 'SettingsSet' },
  description: 'List items',
  input: t.record({}),
  output: t.array(settingsSetRecordType),
}

const windowGetOperation: OperationDescriptor<{ readonly name: string }, Window> = {
  id: 'terminal.windows.get',
  permission: 'terminal:windows:get',
  target: { command: 'get', resource: 'Window' },
  description: 'Get an item by identifier',
  input: t.record({
    name: t.string({ description: 'Item identifier' }),
  }),
  output: windowRecordType,
}

const tabGetOperation: OperationDescriptor<{ readonly name: string }, Tab> = {
  id: 'terminal.tabs.get',
  permission: 'terminal:tabs:get',
  target: { command: 'get', resource: 'Tab' },
  description: 'Get an item by identifier',
  input: t.record({
    name: t.string({ description: 'Item identifier' }),
  }),
  output: tabRecordType,
}

const settingsSetGetOperation: OperationDescriptor<{ readonly name: string }, SettingsSet> = {
  id: 'terminal.settingssets.get',
  permission: 'terminal:settingssets:get',
  target: { command: 'get', resource: 'SettingsSet' },
  description: 'Get an item by identifier',
  input: t.record({
    name: t.string({ description: 'Item identifier' }),
  }),
  output: settingsSetRecordType,
}

const appDoScriptOperation: OperationDescriptor<
  { readonly command: string; readonly in?: string | undefined },
  undefined
> = {
  id: 'terminal.app.doScript',
  permission: 'terminal:app:doScript',
  target: { command: 'doScript' },
  description: 'Execute a shell command in a Terminal window or tab',
  input: t.record({
    command: t.string({ description: 'The command to execute' }),
    in: t.optional(t.string({ description: 'The window or tab to run the command in' })),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<TerminalClient>['operations'] = {
  'terminal.windows.list': windowListOperation,
  'terminal.tabs.list': tabListOperation,
  'terminal.settingssets.list': settingsSetListOperation,
  'terminal.windows.get': windowGetOperation,
  'terminal.tabs.get': tabGetOperation,
  'terminal.settingssets.get': settingsSetGetOperation,
  'terminal.app.doScript': appDoScriptOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): TerminalClient {
  return {
    windows: {
      list: (options) => runtime.invoke(windowListOperation, {}, options),
      get: (name, options) => runtime.invoke(windowGetOperation, { name }, options),
    },
    tabs: {
      list: (options) => runtime.invoke(tabListOperation, {}, options),
      get: (name, options) => runtime.invoke(tabGetOperation, { name }, options),
    },
    settingssets: {
      list: (options) => runtime.invoke(settingsSetListOperation, {}, options),
      get: (name, options) => runtime.invoke(settingsSetGetOperation, { name }, options),
    },
    doScript: (command, _in, options) =>
      runtime.invoke(appDoScriptOperation, { command, in: _in }, options),
  }
}

/**
 * The Terminal contract. Pass it to a client factory to obtain a
 * {@link TerminalClient}.
 */
export const terminalContract: AppContract<TerminalClient> = {
  app: 'terminal',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

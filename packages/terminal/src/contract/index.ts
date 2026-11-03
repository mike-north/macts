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
  type Page,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** A Terminal window */
export interface Window {
  /**
   * The title of the window.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * The unique identifier of the window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: number | null
  /**
   * The position of the window.
   * Nullable. No evidence that the app always sets it.
   */
  position: string | null
  /**
   * Whether the window is visible.
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * Whether the window is the frontmost window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly frontmost: boolean | null
}

/** A Terminal tab */
export interface Tab {
  /**
   * The visible contents of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly contents: string | null
  /**
   * The complete history contents of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly history: string | null
  /**
   * Whether the tab is busy running a process.
   * Nullable. No evidence that the app always sets it.
   */
  readonly busy: boolean | null
  /**
   * The currently running processes in the tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly processes: string | null
  /**
   * Whether the tab is selected.
   * Nullable. No evidence that the app always sets it.
   */
  selected: boolean | null
  /**
   * Whether the title displays a custom title.
   * Nullable. No evidence that the app always sets it.
   */
  titleDisplaysCustomTitle: boolean | null
  /**
   * The custom title of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  customTitle: string | null
  /**
   * The tty device of the tab.
   * Never null: the primary identifier.
   */
  readonly tty: string
  /**
   * The name of the current settings set.
   * Nullable. No evidence that the app always sets it.
   */
  currentSettings: string | null
}

/** A Terminal settings set (profile) */
export interface SettingsSet {
  /**
   * The name of the settings set.
   * Never null: the primary identifier.
   */
  name: string
  /**
   * The unique identifier of the settings set.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: number | null
  /**
   * The number of rows.
   * Nullable. No evidence that the app always sets it.
   */
  numberOfRows: number | null
  /**
   * The number of columns.
   * Nullable. No evidence that the app always sets it.
   */
  numberOfColumns: number | null
  /**
   * The name of the font.
   * Nullable. No evidence that the app always sets it.
   */
  fontName: string | null
  /**
   * The size of the font.
   * Nullable. No evidence that the app always sets it.
   */
  fontSize: number | null
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
  /**
   * The position of the window.
   * Cannot be reset: null is rejected.
   */
  position?: string
  /**
   * Whether the window is visible.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Whether the tab is selected.
   * Cannot be reset: null is rejected.
   */
  selected?: boolean
  /**
   * Whether the title displays a custom title.
   * Cannot be reset: null is rejected.
   */
  titleDisplaysCustomTitle?: boolean
  /**
   * The custom title of the tab.
   * Cannot be reset: null is rejected.
   */
  customTitle?: string
  /**
   * The name of the current settings set.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * The name of the settings set.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The number of rows.
   * Cannot be reset: null is rejected.
   */
  numberOfRows?: number
  /**
   * The number of columns.
   * Cannot be reset: null is rejected.
   */
  numberOfColumns?: number
  /**
   * The name of the font.
   * Cannot be reset: null is rejected.
   */
  fontName?: string
  /**
   * The size of the font.
   * Cannot be reset: null is rejected.
   */
  fontSize?: number
}

/** A Terminal window */
export interface WindowResourceClient {
  /** List windows, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Window>>
  /**
   * Read the window identified by `name`.
   *
   * @param name - Item identifier. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Window>
}

/** A Terminal tab */
export interface TabResourceClient {
  /** List tabs, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Tab>>
  /**
   * Read the tab identified by `name`.
   *
   * @param name - Item identifier. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Tab>
}

/** A Terminal settings set (profile) */
export interface SettingsSetResourceClient {
  /** List settings sets, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<SettingsSet>>
  /**
   * Read the settings set identified by `name`.
   *
   * @param name - Item identifier. Does not accept null.
   */
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
  readonly settingsSets: SettingsSetResourceClient
  /**
   * Execute a shell command in a Terminal window or tab
   *
   * @param command - The command to execute. Does not accept null.
   * @param _in - The window or tab to run the command in. Does not accept null.
   */
  doScript(command: string, _in?: string, options?: CallOptions): Promise<void>
}

const windowRecordType: ValueType<Window> = t.record(
  {
    name: t.string({ description: 'The title of the window' }),
    id: t.nullable(t.double(), { description: 'The unique identifier of the window' }),
    position: t.nullable(t.string(), { description: 'The position of the window' }),
    visible: t.nullable(t.boolean(), { description: 'Whether the window is visible' }),
    frontmost: t.nullable(t.boolean(), {
      description: 'Whether the window is the frontmost window',
    }),
  },
  { description: 'A Terminal window' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    contents: t.nullable(t.string(), { description: 'The visible contents of the tab' }),
    history: t.nullable(t.string(), { description: 'The complete history contents of the tab' }),
    busy: t.nullable(t.boolean(), { description: 'Whether the tab is busy running a process' }),
    processes: t.nullable(t.string(), {
      description: 'The currently running processes in the tab',
    }),
    selected: t.nullable(t.boolean(), { description: 'Whether the tab is selected' }),
    titleDisplaysCustomTitle: t.nullable(t.boolean(), {
      description: 'Whether the title displays a custom title',
    }),
    customTitle: t.nullable(t.string(), { description: 'The custom title of the tab' }),
    tty: t.string({ description: 'The tty device of the tab' }),
    currentSettings: t.nullable(t.string(), {
      description: 'The name of the current settings set',
    }),
  },
  { description: 'A Terminal tab' }
)

const settingsSetRecordType: ValueType<SettingsSet> = t.record(
  {
    name: t.string({ description: 'The name of the settings set' }),
    id: t.nullable(t.double(), { description: 'The unique identifier of the settings set' }),
    numberOfRows: t.nullable(t.double(), { description: 'The number of rows' }),
    numberOfColumns: t.nullable(t.double(), { description: 'The number of columns' }),
    fontName: t.nullable(t.string(), { description: 'The name of the font' }),
    fontSize: t.nullable(t.double(), { description: 'The size of the font' }),
  },
  { description: 'A Terminal settings set (profile)' }
)

/**
 * The type of the resource table of {@link terminalContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type TerminalResources = Readonly<{
  Window: ResourceDescriptor<Window, string> & {
    readonly id: ValueType<string>
    readonly get: 'terminal.windows.get'
    readonly list: 'terminal.windows.list'
  }
  Tab: ResourceDescriptor<Tab, string> & {
    readonly id: ValueType<string>
    readonly get: 'terminal.tabs.get'
    readonly list: 'terminal.tabs.list'
  }
  SettingsSet: ResourceDescriptor<SettingsSet, string> & {
    readonly id: ValueType<string>
    readonly get: 'terminal.settingsSets.get'
    readonly list: 'terminal.settingsSets.list'
  }
}>

/**
 * The resource table: the implementation of {@link TerminalResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
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
    get: 'terminal.settingsSets.get',
    list: 'terminal.settingsSets.list',
  },
} satisfies TerminalResources

const windowListOperation: OperationDescriptor<Record<string, never>, Page<Window>> = {
  id: 'terminal.windows.list',
  permission: 'terminal:windows:list',
  target: { command: 'list', resource: 'Window' },
  description: 'List items',
  input: t.record({}),
  output: t.page(windowRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const tabListOperation: OperationDescriptor<Record<string, never>, Page<Tab>> = {
  id: 'terminal.tabs.list',
  permission: 'terminal:tabs:list',
  target: { command: 'list', resource: 'Tab' },
  description: 'List items',
  input: t.record({}),
  output: t.page(tabRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const settingsSetListOperation: OperationDescriptor<Record<string, never>, Page<SettingsSet>> = {
  id: 'terminal.settingsSets.list',
  permission: 'terminal:settingsSets:list',
  target: { command: 'list', resource: 'SettingsSet' },
  description: 'List items',
  input: t.record({}),
  output: t.page(settingsSetRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item identifier' } },
    required: ['name'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item identifier' } },
    required: ['name'],
    additionalProperties: false,
  },
}

const settingsSetGetOperation: OperationDescriptor<{ readonly name: string }, SettingsSet> = {
  id: 'terminal.settingsSets.get',
  permission: 'terminal:settingsSets:get',
  target: { command: 'get', resource: 'SettingsSet' },
  description: 'Get an item by identifier',
  input: t.record({
    name: t.string({ description: 'Item identifier' }),
  }),
  output: settingsSetRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Item identifier' } },
    required: ['name'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command to execute' },
      in: { type: 'string', description: 'The window or tab to run the command in' },
    },
    required: ['command'],
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<TerminalClient>['operations'] = {
  'terminal.windows.list': windowListOperation,
  'terminal.tabs.list': tabListOperation,
  'terminal.settingsSets.list': settingsSetListOperation,
  'terminal.windows.get': windowGetOperation,
  'terminal.tabs.get': tabGetOperation,
  'terminal.settingsSets.get': settingsSetGetOperation,
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
    settingsSets: {
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
export const terminalContract: AppContract<TerminalClient, TerminalResources> = {
  app: 'terminal',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

/**
 * The Arc contract: the transport-neutral description of every
 * Arc operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ArcClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `ArcClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { arcContract } from '@macts/arc/contract'
 *
 * const client = createClient(arcContract, { token, url })
 * ```
 *
 * Generated from the Arc manifest; do not edit.
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
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** An application's window */
export interface Window {
  /** The unique identifier of the window. */
  readonly id: string
  /** The full title of the window. */
  readonly name: string
  /** The index of the window, ordered front to back. */
  index: Integer
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
  /** Returns the currently active space */
  readonly activeSpace: ObjectReferenceVariant<Space, string>
  /** Whether the window is an incognito window. */
  incognito: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode: string
}

/** A window's tab */
export interface Tab {
  /** The unique identifier of the tab. */
  readonly id: string
  /** The full title of the tab. */
  readonly title: string
  /** The url of the tab. */
  uRL: string
  /** Is loading? */
  readonly loading: boolean
  /**
   * Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.
   */
  location: string
}

/** A space */
export interface Space {
  /** The unique identifier of the space. */
  readonly id: string
  /** The full title of the space. */
  readonly title: string
}

/** Input for creating a Window. */
export interface WindowCreateInput {
  /** The index of the window, ordered front to back. */
  index?: Integer
  /** Whether the window is currently minimized. */
  minimized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /** Whether the window is an incognito window. */
  incognito?: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode?: string
}

/** Input for updating a Window. Omitted fields are left unchanged. */
export interface WindowUpdateInput {
  /** The index of the window, ordered front to back. */
  index?: Integer
  /** Whether the window is currently minimized. */
  minimized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /** Whether the window is an incognito window. */
  incognito?: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   */
  mode?: string
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The url of the tab. */
  uRL?: string
  /**
   * Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.
   */
  location?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** The url of the tab. */
  uRL?: string
  /**
   * Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.
   */
  location?: string
}

/** Input for creating a Space. */
export type SpaceCreateInput = Record<string, never>

/** Input for updating a Space. Omitted fields are left unchanged. */
export type SpaceUpdateInput = Record<string, never>

/**
 * The Arc client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link arcContract}.
 */
export interface ArcClient {
  /** Make a new object. */
  make(_new: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Return the number of elements of a particular class within an object. */
  count(each?: string, options?: CallOptions): Promise<void>
  /** Close */
  close(options?: CallOptions): Promise<void>
  /** Select the tab. */
  select(options?: CallOptions): Promise<void>
  /** Go Back (If Possible). */
  goBack(options?: CallOptions): Promise<void>
  /** Go Forward (If Possible). */
  goForward(options?: CallOptions): Promise<void>
  /** Reload a tab. */
  reload(options?: CallOptions): Promise<void>
  /** Stop the current tab from loading. */
  stop(options?: CallOptions): Promise<void>
  /** Execute a piece of javascript. */
  execute(javascript: string, options?: CallOptions): Promise<void>
  /** Focus on a space. */
  focus(options?: CallOptions): Promise<void>
}

const windowRecordType: ValueType<Window> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the window.' }),
    name: t.string({ description: 'The full title of the window.' }),
    index: t.integer({ description: 'The index of the window, ordered front to back.' }),
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
    activeSpace: t.reference<Space, string>(() => resources, 'Space', 'one', {
      description: 'Returns the currently active space',
    }),
    incognito: t.boolean({ description: 'Whether the window is an incognito window.' }),
    mode: t.string({
      description:
        "Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window.",
    }),
  },
  { description: "An application's window" }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the tab.' }),
    title: t.string({ description: 'The full title of the tab.' }),
    uRL: t.string({ description: 'The url of the tab.' }),
    loading: t.boolean({ description: 'Is loading?' }),
    location: t.string({
      description:
        "Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.",
    }),
  },
  { description: "A window's tab" }
)

const spaceRecordType: ValueType<Space> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the space.' }),
    title: t.string({ description: 'The full title of the space.' }),
  },
  { description: 'A space' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ArcClient>['resources'] = {
  Window: {
    name: 'Window',
    record: windowRecordType,
    id: t.string({ description: 'The unique identifier of the window.' }),
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
    id: t.string({ description: 'The unique identifier of the tab.' }),
  },
  Space: {
    name: 'Space',
    record: spaceRecordType,
    id: t.string({ description: 'The unique identifier of the space.' }),
  },
}

const appMakeOperation: OperationDescriptor<
  { readonly new: string; readonly withProperties?: unknown },
  undefined
> = {
  id: 'arc.app.make',
  permission: 'arc:app:make',
  target: { command: 'make' },
  description: 'Make a new object.',
  input: t.record({
    new: t.string({ description: 'The class of the new object.' }),
    withProperties: t.optional(
      t.unknown({ description: 'The initial values for properties of the object.' })
    ),
  }),
  output: t.none(),
}

const appCountOperation: OperationDescriptor<{ readonly each?: string | undefined }, undefined> = {
  id: 'arc.app.count',
  permission: 'arc:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object.',
  input: t.record({
    each: t.optional(t.string({ description: 'The class of objects to be counted.' })),
  }),
  output: t.none(),
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.close',
  permission: 'arc:app:close',
  target: { command: 'close' },
  description: 'Close',
  input: t.record({}),
  output: t.none(),
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.select',
  permission: 'arc:app:select',
  target: { command: 'select' },
  description: 'Select the tab.',
  input: t.record({}),
  output: t.none(),
}

const appGoBackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.goBack',
  permission: 'arc:app:goBack',
  target: { command: 'goBack' },
  description: 'Go Back (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appGoForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.goForward',
  permission: 'arc:app:goForward',
  target: { command: 'goForward' },
  description: 'Go Forward (If Possible).',
  input: t.record({}),
  output: t.none(),
}

const appReloadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.reload',
  permission: 'arc:app:reload',
  target: { command: 'reload' },
  description: 'Reload a tab.',
  input: t.record({}),
  output: t.none(),
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.stop',
  permission: 'arc:app:stop',
  target: { command: 'stop' },
  description: 'Stop the current tab from loading.',
  input: t.record({}),
  output: t.none(),
}

const appExecuteOperation: OperationDescriptor<{ readonly javascript: string }, undefined> = {
  id: 'arc.app.execute',
  permission: 'arc:app:execute',
  target: { command: 'execute' },
  description: 'Execute a piece of javascript.',
  input: t.record({
    javascript: t.string({ description: 'The javascript code to execute.' }),
  }),
  output: t.none(),
}

const appFocusOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.focus',
  permission: 'arc:app:focus',
  target: { command: 'focus' },
  description: 'Focus on a space.',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ArcClient>['operations'] = {
  'arc.app.make': appMakeOperation,
  'arc.app.count': appCountOperation,
  'arc.app.close': appCloseOperation,
  'arc.app.select': appSelectOperation,
  'arc.app.goBack': appGoBackOperation,
  'arc.app.goForward': appGoForwardOperation,
  'arc.app.reload': appReloadOperation,
  'arc.app.stop': appStopOperation,
  'arc.app.execute': appExecuteOperation,
  'arc.app.focus': appFocusOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ArcClient {
  return {
    make: (_new, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, withProperties }, options),
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    select: (options) => runtime.invoke(appSelectOperation, {}, options),
    goBack: (options) => runtime.invoke(appGoBackOperation, {}, options),
    goForward: (options) => runtime.invoke(appGoForwardOperation, {}, options),
    reload: (options) => runtime.invoke(appReloadOperation, {}, options),
    stop: (options) => runtime.invoke(appStopOperation, {}, options),
    execute: (javascript, options) => runtime.invoke(appExecuteOperation, { javascript }, options),
    focus: (options) => runtime.invoke(appFocusOperation, {}, options),
  }
}

/**
 * The Arc contract. Pass it to a client factory to obtain a
 * {@link ArcClient}.
 */
export const arcContract: AppContract<ArcClient> = {
  app: 'arc',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

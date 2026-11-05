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
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ArcClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Arc manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/** An application's window */
export interface Window {
  /**
   * The unique identifier of the window.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The full title of the window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The index of the window, ordered front to back.
   * Nullable. No evidence that the app always sets it.
   */
  index: Integer | null
  /**
   * Whether the window has a close box.
   * Nullable. No evidence that the app always sets it.
   */
  readonly closeable: boolean | null
  /**
   * Whether the window can be minimized.
   * Nullable. No evidence that the app always sets it.
   */
  readonly minimizable: boolean | null
  /**
   * Whether the window is currently minimized.
   * Nullable. No evidence that the app always sets it.
   */
  minimized: boolean | null
  /**
   * Whether the window can be resized.
   * Nullable. No evidence that the app always sets it.
   */
  readonly resizable: boolean | null
  /**
   * Whether the window is currently visible.
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * Whether the window can be zoomed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly zoomable: boolean | null
  /**
   * Whether the window is currently zoomed.
   * Nullable. No evidence that the app always sets it.
   */
  zoomed: boolean | null
  /**
   * Whether the window is an incognito window.
   * Nullable. No evidence that the app always sets it.
   */
  incognito: boolean | null
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   * Nullable. No evidence that the app always sets it.
   */
  mode: string | null
}

/** A window's tab */
export interface Tab {
  /**
   * The unique identifier of the tab.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The full title of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly title: string | null
  /**
   * The url of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  uRL: string | null
  /**
   * Is loading?
   * Nullable. No evidence that the app always sets it.
   */
  readonly loading: boolean | null
  /**
   * Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.
   * Nullable. No evidence that the app always sets it.
   */
  location: string | null
}

/** A space */
export interface Space {
  /**
   * The unique identifier of the space.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The full title of the space.
   * Nullable. No evidence that the app always sets it.
   */
  readonly title: string | null
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
  /**
   * The index of the window, ordered front to back.
   * Cannot be reset: null is rejected.
   */
  index?: Integer
  /**
   * Whether the window is currently minimized.
   * Cannot be reset: null is rejected.
   */
  minimized?: boolean
  /**
   * Whether the window is currently visible.
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
  /**
   * Whether the window is currently zoomed.
   * Cannot be reset: null is rejected.
   */
  zoomed?: boolean
  /**
   * Whether the window is an incognito window.
   * Cannot be reset: null is rejected.
   */
  incognito?: boolean
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   * Cannot be reset: null is rejected.
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
  /**
   * The url of the tab.
   * Cannot be reset: null is rejected.
   */
  uRL?: string
  /**
   * Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.
   * Cannot be reset: null is rejected.
   */
  location?: string
}

/** Input for creating a Space. */
export type SpaceCreateInput = Record<string, never>

/** Input for updating a Space. Omitted fields are left unchanged. */
export type SpaceUpdateInput = Record<string, never>

/**
 * The Arc client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from `arcContract` in the app's `/contract` entry. Its type carries
 * the contract's resource table, {@link ArcResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface ArcClient extends ClientBrand<ArcResources> {
  /**
   * Make a new object.
   *
   * @param _new - The class of the new object. Does not accept null.
   * @param withProperties - The initial values for properties of the object. Does not accept null.
   */
  make(_new: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /**
   * Return the number of elements of a particular class within an object.
   *
   * @param each - The class of objects to be counted. Does not accept null.
   */
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
  /**
   * Execute a piece of javascript.
   *
   * @param javascript - The javascript code to execute. Does not accept null.
   */
  execute(javascript: string, options?: CallOptions): Promise<void>
  /** Focus on a space. */
  focus(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table in `arcContract` (the app's `/contract` entry): every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type ArcResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link ArcResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies ArcResources

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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: { type: 'string', description: 'The class of the new object.' },
      withProperties: {
        allOf: [
          {
            description: 'The initial values for properties of the object.',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['new'],
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

const appCountOperation: OperationDescriptor<{ readonly each?: string | undefined }, undefined> = {
  id: 'arc.app.count',
  permission: 'arc:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object.',
  input: t.record({
    each: t.optional(t.string({ description: 'The class of objects to be counted.' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { each: { type: 'string', description: 'The class of objects to be counted.' } },
    additionalProperties: false,
  },
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.close',
  permission: 'arc:app:close',
  target: { command: 'close' },
  description: 'Close',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.select',
  permission: 'arc:app:select',
  target: { command: 'select' },
  description: 'Select the tab.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appGoBackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.goBack',
  permission: 'arc:app:goBack',
  target: { command: 'goBack' },
  description: 'Go Back (If Possible).',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appGoForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.goForward',
  permission: 'arc:app:goForward',
  target: { command: 'goForward' },
  description: 'Go Forward (If Possible).',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appReloadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.reload',
  permission: 'arc:app:reload',
  target: { command: 'reload' },
  description: 'Reload a tab.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.stop',
  permission: 'arc:app:stop',
  target: { command: 'stop' },
  description: 'Stop the current tab from loading.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { javascript: { type: 'string', description: 'The javascript code to execute.' } },
    required: ['javascript'],
    additionalProperties: false,
  },
}

const appFocusOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'arc.app.focus',
  permission: 'arc:app:focus',
  target: { command: 'focus' },
  description: 'Focus on a space.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
export const arcContract: AppContract<ArcClient, ArcResources> = {
  app: 'arc',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

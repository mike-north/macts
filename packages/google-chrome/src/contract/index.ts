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
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `GoogleChromeClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Google Chrome manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type FileSource,
  type Integer,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Rectangle,
} from '@macts/contracts'

const t = ValueTypes

/** A window. */
export interface Window {
  /**
   * The given name of the window.
   * Nullable. No evidence that the app always sets it.
   */
  givenName: string | null
  /**
   * The full title of the window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the window.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The index of the window, ordered front to back.
   * Nullable. No evidence that the app always sets it.
   */
  index: Integer | null
  /**
   * The bounding rectangle of the window.
   * Nullable. No evidence that the app always sets it.
   */
  bounds: Rectangle | null
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
   * Returns the currently selected tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly activeTab: ObjectReferenceVariant<Tab, string, 'Tab'> | null
  /**
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   * Nullable. No evidence that the app always sets it.
   */
  mode: string | null
  /**
   * The index of the active tab.
   * Nullable. No evidence that the app always sets it.
   */
  activeTabIndex: Integer | null
}

/** A tab. */
export interface Tab {
  /**
   * Unique ID of the tab.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The title of the tab.
   * Nullable. No evidence that the app always sets it.
   */
  readonly title: string | null
  /**
   * The url visible to the user.
   * Nullable. No evidence that the app always sets it.
   */
  uRL: string | null
  /**
   * Is loading?
   * Nullable. No evidence that the app always sets it.
   */
  readonly loading: boolean | null
}

/** A bookmarks folder that contains other bookmarks folder and bookmark items. */
export interface BookmarkFolder {
  /**
   * Unique ID of the bookmark folder.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The title of the folder.
   * Nullable. No evidence that the app always sets it.
   */
  title: string | null
  /**
   * Returns the index with respect to its parent bookmark folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly index: number | null
}

/** An item consists of an URL and the title of a bookmark */
export interface BookmarkItem {
  /**
   * Unique ID of the bookmark item.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The title of the bookmark item.
   * Nullable. No evidence that the app always sets it.
   */
  title: string | null
  /**
   * The URL of the bookmark.
   * Nullable. No evidence that the app always sets it.
   */
  uRL: string | null
  /**
   * Returns the index with respect to its parent bookmark folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly index: number | null
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
  /**
   * The given name of the window.
   * Cannot be reset: null is rejected.
   */
  givenName?: string
  /**
   * The index of the window, ordered front to back.
   * Cannot be reset: null is rejected.
   */
  index?: Integer
  /**
   * The bounding rectangle of the window.
   * Cannot be reset: null is rejected.
   */
  bounds?: Rectangle
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
   * Represents the mode of the window which can be 'normal' or 'incognito', can be set only once
   * during creation of the window.
   * Cannot be reset: null is rejected.
   */
  mode?: string
  /**
   * The index of the active tab.
   * Cannot be reset: null is rejected.
   */
  activeTabIndex?: Integer
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The url visible to the user. */
  uRL?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /**
   * The url visible to the user.
   * Cannot be reset: null is rejected.
   */
  uRL?: string
}

/** Input for creating a BookmarkFolder. */
export interface BookmarkFolderCreateInput {
  /** The title of the folder. */
  title?: string
}

/** Input for updating a BookmarkFolder. Omitted fields are left unchanged. */
export interface BookmarkFolderUpdateInput {
  /**
   * The title of the folder.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * The title of the bookmark item.
   * Cannot be reset: null is rejected.
   */
  title?: string
  /**
   * The URL of the bookmark.
   * Cannot be reset: null is rejected.
   */
  uRL?: string
}

/**
 * The Google Chrome client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link googleChromeContract}. Its type carries the
 * contract's resource table, {@link GoogleChromeResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface GoogleChromeClient extends ClientBrand<GoogleChromeResources> {
  /**
   * Save an object.
   *
   * @param _in - The file in which to save the object. Does not accept null.
   * @param as - The file type in which to save the data. Can be 'only html', 'complete html', or
   * 'single file'; default is 'complete html'. Does not accept null.
   */
  save(_in?: FileSource, as?: string, options?: CallOptions): Promise<void>
  /** Open a document. */
  open(options?: CallOptions): Promise<void>
  /** Close a window. */
  close(options?: CallOptions): Promise<void>
  /** Quit the application. */
  quit(options?: CallOptions): Promise<void>
  /**
   * Return the number of elements of a particular class within an object.
   *
   * @param each - The class of objects to be counted. Does not accept null.
   */
  count(each?: string, options?: CallOptions): Promise<void>
  /** Delete an object. */
  _delete(options?: CallOptions): Promise<void>
  /**
   * Copy object(s) and put the copies at a new location.
   *
   * @param to - The location for the new object(s). Does not accept null.
   * @param withProperties - Properties to be set in the new duplicated object(s). Does not accept
   * null.
   */
  duplicate(to?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Verify if an object exists. */
  exists(options?: CallOptions): Promise<void>
  /**
   * Make a new object.
   *
   * @param _new - The class of the new object. Does not accept null.
   * @param at - The location at which to insert the object. Does not accept null.
   * @param withData - The initial contents of the object. Does not accept null.
   * @param withProperties - The initial values for properties of the object. Does not accept null.
   */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Move object(s) to a new location.
   *
   * @param to - The new location for the object(s). Does not accept null.
   */
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
  /**
   * Execute a piece of javascript.
   *
   * @param javascript - The javascript code to execute. Does not accept null.
   */
  execute(javascript: string, options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link googleChromeContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for a resource the app finds only within another,
 * that parent resource. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type GoogleChromeResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link GoogleChromeResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies GoogleChromeResources

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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      in: {
        type: 'object',
        properties: {
          fileSource: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'caller-owned-file' },
                  path: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'path'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'uploaded-file' },
                  uploadId: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'uploadId'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['fileSource'],
        additionalProperties: false,
        description: 'The file in which to save the object.',
      },
      as: {
        type: 'string',
        description:
          "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'.",
      },
    },
    additionalProperties: false,
  },
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.open',
  permission: 'google-chrome:app:open',
  target: { command: 'open' },
  description: 'Open a document.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.close',
  permission: 'google-chrome:app:close',
  target: { command: 'close' },
  description: 'Close a window.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.quit',
  permission: 'google-chrome:app:quit',
  target: { command: 'quit' },
  description: 'Quit the application.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { each: { type: 'string', description: 'The class of objects to be counted.' } },
    additionalProperties: false,
  },
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.delete',
  permission: 'google-chrome:app:delete',
  target: { command: 'delete' },
  description: 'Delete an object.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      to: { type: 'string', description: 'The location for the new object(s).' },
      withProperties: {
        allOf: [
          {
            description: 'Properties to be set in the new duplicated object(s).',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
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

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.exists',
  permission: 'google-chrome:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: { type: 'string', description: 'The class of the new object.' },
      at: { type: 'string', description: 'The location at which to insert the object.' },
      withData: {
        allOf: [
          { description: 'The initial contents of the object.', $ref: '#/definitions/__schema0' },
        ],
      },
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

const appMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'google-chrome.app.move',
  permission: 'google-chrome:app:move',
  target: { command: 'move' },
  description: 'Move object(s) to a new location.',
  input: t.record({
    to: t.string({ description: 'The new location for the object(s).' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'The new location for the object(s).' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appPrintOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.print',
  permission: 'google-chrome:app:print',
  target: { command: 'print' },
  description: 'Print an object.',
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
  id: 'google-chrome.app.reload',
  permission: 'google-chrome:app:reload',
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

const appGoBackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.goBack',
  permission: 'google-chrome:app:goBack',
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
  id: 'google-chrome.app.goForward',
  permission: 'google-chrome:app:goForward',
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

const appSelectAllOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.selectAll',
  permission: 'google-chrome:app:selectAll',
  target: { command: 'selectAll' },
  description: 'Select all.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCutSelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.cutSelection',
  permission: 'google-chrome:app:cutSelection',
  target: { command: 'cutSelection' },
  description: 'Cut selected text (If Possible).',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCopySelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.copySelection',
  permission: 'google-chrome:app:copySelection',
  target: { command: 'copySelection' },
  description: 'Copy text.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPasteSelectionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.pasteSelection',
  permission: 'google-chrome:app:pasteSelection',
  target: { command: 'pasteSelection' },
  description: 'Paste text (If Possible).',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.undo',
  permission: 'google-chrome:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last change.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.redo',
  permission: 'google-chrome:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last change.',
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
  id: 'google-chrome.app.stop',
  permission: 'google-chrome:app:stop',
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

const appViewSourceOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'google-chrome.app.viewSource',
  permission: 'google-chrome:app:viewSource',
  target: { command: 'viewSource' },
  description: 'View the HTML source of the tab.',
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
  id: 'google-chrome.app.execute',
  permission: 'google-chrome:app:execute',
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
export const googleChromeContract: AppContract<GoogleChromeClient, GoogleChromeResources> = {
  app: 'google-chrome',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

/**
 * The Finder contract: the transport-neutral description of every
 * Finder operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `FinderClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `FinderClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Finder manifest; do not edit.
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
} from '@macts/contracts'

const t = ValueTypes

/** Priv */
export type Priv = 'readOnly' | 'readWrite' | 'writeOnly' | 'none'

/** Edfm */
export type Edfm =
  | 'macOSFormat'
  | 'macOSExtendedFormat'
  | 'uFSFormat'
  | 'nFSFormat'
  | 'audioFormat'
  | 'proDOSFormat'
  | 'mSDOSFormat'
  | 'nTFSFormat'
  | '9660'
  | 'highSierraFormat'
  | 'quickTakeFormat'
  | 'applePhotoFormat'
  | 'appleShareFormat'
  | 'uDFFormat'
  | 'webDAVFormat'
  | 'fTPFormat'
  | 'packetWrittenUDFFormat'
  | 'xsanFormat'
  | 'aPFSFormat'
  | 'exFATFormat'
  | 'sMBFormat'
  | 'unknownFormat'

/** Ipnl */
export type Ipnl =
  | 'generalInformationPanel'
  | 'sharingPanel'
  | 'memoryPanel'
  | 'previewPanel'
  | 'applicationPanel'
  | 'languagesPanel'
  | 'pluginsPanel'
  | 'nameExtensionPanel'
  | 'commentsPanel'
  | 'contentIndexPanel'
  | 'burningPanel'
  | 'moreInfoPanel'
  | 'simpleHeaderPanel'

/** Pple */
export type Pple =
  | 'generalPreferencesPanel'
  | 'labelPreferencesPanel'
  | 'sidebarPreferencesPanel'
  | 'advancedPreferencesPanel'

/** Ecvw */
export type Ecvw = 'iconView' | 'listView' | 'columnView' | 'groupView' | 'flowView'

/** Earr */
export type Earr =
  | 'notArranged'
  | 'snapToGrid'
  | 'arrangedByName'
  | 'arrangedByModificationDate'
  | 'arrangedByCreationDate'
  | 'arrangedBySize'
  | 'arrangedByKind'
  | 'arrangedByLabel'

/** Epos */
export type Epos = 'right' | 'bottom'

/** Sodr */
export type Sodr = 'normal' | 'reversed'

/** Elsv */
export type Elsv =
  | 'nameColumn'
  | 'modificationDateColumn'
  | 'creationDateColumn'
  | 'sizeColumn'
  | 'kindColumn'
  | 'labelColumn'
  | 'versionColumn'
  | 'commentColumn'

/** Lvic */
export type Lvic = 'smallIcon' | 'largeIcon'

/** Isiz */
export type Isiz = 'mini' | 'small' | 'large'

/** Sort */
export type Sort =
  | 'name'
  | 'modificationDate'
  | 'creationDate'
  | 'size'
  | 'kind'
  | 'labelIndex'
  | 'comment'
  | 'version'

/** An item that contains other items */
export interface Container {
  /**
   * the entire contents of the container, including the contents of its children.
   * Nullable. No evidence that the app always sets it.
   */
  readonly entireContents: string | null
}

/** A disk */
export interface Disk {
  /**
   * the unique id for this disk (unchanged while disk remains connected and Finder remains
   * running).
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * the total number of bytes (free or used) on the disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly capacity: number | null
  /**
   * the number of free bytes left on the disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly freeSpace: number | null
  /**
   * Can the media be ejected (floppies, CDs, and so on)?
   * Nullable. No evidence that the app always sets it.
   */
  readonly ejectable: boolean | null
  /**
   * Is the media a local volume (as opposed to a file server)?
   * Nullable. No evidence that the app always sets it.
   */
  readonly localVolume: boolean | null
  /**
   * Is this disk the boot disk?
   * Nullable. No evidence that the app always sets it.
   */
  readonly startup: boolean | null
  /**
   * the filesystem format of this disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly format: string | null
  /**
   * Does this disk do file system journaling?
   * Nullable. No evidence that the app always sets it.
   */
  readonly journalingEnabled: boolean | null
  /**
   * Ignore permissions on this disk?
   * Nullable. No evidence that the app always sets it.
   */
  ignorePrivileges: boolean | null
}

/** A folder */
export interface Folder {
  /**
   * Unique identifier for this folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** A file */
export interface File {
  /**
   * the OSType identifying the type of data contained in the item.
   * Nullable. Observed missing in 58 of 60 items (Finder 27.2, macOS 27.2, 2026-11-01).
   */
  fileType: string | null
  /**
   * the OSType identifying the application that created the item.
   * Nullable. Observed missing in 58 of 60 items (Finder 27.2, macOS 27.2, 2026-11-01).
   */
  creatorType: string | null
  /**
   * Is the file a stationery pad?
   * Never null: observed in all 60 items (Finder 27.2, macOS 27.2, 2026-11-01).
   */
  stationery: boolean
  /**
   * the version of the product (visible at the top of the “Get Info” window).
   * Never null: observed in all 60 items (Finder 27.2, macOS 27.2, 2026-11-01).
   */
  readonly productVersion: string
  /**
   * the version of the file (visible at the bottom of the “Get Info” window).
   * Never null: observed in all 60 items (Finder 27.2, macOS 27.2, 2026-11-01).
   */
  readonly version: string
}

/** An alias file (created with “Make Alias”) */
export interface AliasFile {
  /**
   * the original item pointed to by the alias.
   * Nullable. No evidence that the app always sets it.
   */
  originalItem: string | null
}

/** An application's file on disk */
export interface ApplicationFile {
  /**
   * the bundle identifier or creator type of the application.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Is the application high-level event aware? (OBSOLETE: always returns true).
   * Nullable. No evidence that the app always sets it.
   */
  readonly acceptsHighLevelEvents: boolean | null
  /**
   * Does the process have a scripting terminology, i.e., can it be scripted?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hasScriptingTerminology: boolean | null
}

/** A document file */
export type DocumentFile = Record<string, never>

/** A file containing an internet location */
export interface InternetLocationFile {
  /**
   * the internet location.
   * Nullable. No evidence that the app always sets it.
   */
  readonly location: string | null
}

/** A clipping */
export interface Clipping {
  /**
   * (NOT AVAILABLE YET) the clipping window for this clipping.
   * Nullable. No evidence that the app always sets it.
   */
  readonly clippingWindow: string | null
}

/** A package */
export interface Package {
  /**
   * Unique identifier for this package.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A file viewer window */
export interface FinderWindow {
  /**
   * the container at which this file viewer is targeted.
   * Nullable. No evidence that the app always sets it.
   */
  target: string | null
  /**
   * the current view for the container window.
   * Nullable. No evidence that the app always sets it.
   */
  currentView: string | null
  /**
   * the icon view options for the container window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly iconViewOptions: unknown
  /**
   * the list view options for the container window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly listViewOptions: ObjectReferenceVariant<ListViewOptions, never, 'ListViewOptions'> | null
  /**
   * the column view options for the container window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly columnViewOptions: unknown
  /**
   * Is the window's toolbar visible?
   * Nullable. No evidence that the app always sets it.
   */
  toolbarVisible: boolean | null
  /**
   * Is the window's status bar visible?
   * Nullable. No evidence that the app always sets it.
   */
  statusbarVisible: boolean | null
  /**
   * Is the window's path bar visible?
   * Nullable. No evidence that the app always sets it.
   */
  pathbarVisible: boolean | null
  /**
   * the width of the sidebar for the container window.
   * Nullable. No evidence that the app always sets it.
   */
  sidebarWidth: Integer | null
}

/** The window containing a clipping */
export interface ClippingWindow {
  /**
   * Unique identifier for this window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** the list view options */
export interface ListViewOptions {
  /**
   * Are folder sizes calculated and displayed in the window?
   * Nullable. No evidence that the app always sets it.
   */
  calculatesFolderSizes: boolean | null
  /**
   * displays a preview of the item in list view.
   * Nullable. No evidence that the app always sets it.
   */
  showsIconPreview: boolean | null
  /**
   * the size of icons displayed in the list view.
   * Nullable. No evidence that the app always sets it.
   */
  iconSize: string | null
  /**
   * the size of the text displayed in the list view.
   * Nullable. No evidence that the app always sets it.
   */
  textSize: Integer | null
  /**
   * the column that the list view is sorted on.
   * Nullable. No evidence that the app always sets it.
   */
  sortColumn: ObjectReferenceVariant<Column, never, 'Column'> | null
  /**
   * Are relative dates (e.g., today, yesterday) shown in the list view?
   * Nullable. No evidence that the app always sets it.
   */
  usesRelativeDates: boolean | null
}

/** a column of a list view */
export interface Column {
  /**
   * the index in the front-to-back ordering within its container.
   * Nullable. No evidence that the app always sets it.
   */
  index: Integer | null
  /**
   * the column name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The direction in which the window is sorted.
   * Nullable. No evidence that the app always sets it.
   */
  sortDirection: string | null
  /**
   * the width of this column.
   * Nullable. No evidence that the app always sets it.
   */
  width: Integer | null
  /**
   * the minimum allowed width of this column.
   * Nullable. No evidence that the app always sets it.
   */
  readonly minimumWidth: Integer | null
  /**
   * the maximum allowed width of this column.
   * Nullable. No evidence that the app always sets it.
   */
  readonly maximumWidth: Integer | null
  /**
   * is this column visible.
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
}

/** Input for creating a Container. */
export type ContainerCreateInput = Record<string, never>

/** Input for updating a Container. Omitted fields are left unchanged. */
export type ContainerUpdateInput = Record<string, never>

/** Input for creating a Disk. */
export interface DiskCreateInput {
  /** Ignore permissions on this disk? */
  ignorePrivileges?: boolean
}

/** Input for updating a Disk. Omitted fields are left unchanged. */
export interface DiskUpdateInput {
  /**
   * Ignore permissions on this disk?
   * Cannot be reset: null is rejected.
   */
  ignorePrivileges?: boolean
}

/** Input for creating a Folder. */
export type FolderCreateInput = Record<string, never>

/** Input for updating a Folder. Omitted fields are left unchanged. */
export type FolderUpdateInput = Record<string, never>

/** Input for creating a File. */
export interface FileCreateInput {
  /** the OSType identifying the type of data contained in the item */
  fileType?: string
  /** the OSType identifying the application that created the item */
  creatorType?: string
  /** Is the file a stationery pad? */
  stationery?: boolean
}

/** Input for updating a File. Omitted fields are left unchanged. */
export interface FileUpdateInput {
  /**
   * the OSType identifying the type of data contained in the item.
   * Cannot be reset: null is rejected.
   */
  fileType?: string
  /**
   * the OSType identifying the application that created the item.
   * Cannot be reset: null is rejected.
   */
  creatorType?: string
  /**
   * Is the file a stationery pad?
   * Cannot be reset: null is rejected.
   */
  stationery?: boolean
}

/** Input for creating an AliasFile. */
export interface AliasFileCreateInput {
  /** the original item pointed to by the alias */
  originalItem?: string
}

/** Input for updating an AliasFile. Omitted fields are left unchanged. */
export interface AliasFileUpdateInput {
  /**
   * the original item pointed to by the alias.
   * Cannot be reset: null is rejected.
   */
  originalItem?: string
}

/** Input for creating an ApplicationFile. */
export type ApplicationFileCreateInput = Record<string, never>

/** Input for updating an ApplicationFile. Omitted fields are left unchanged. */
export type ApplicationFileUpdateInput = Record<string, never>

/** Input for creating a DocumentFile. */
export type DocumentFileCreateInput = Record<string, never>

/** Input for updating a DocumentFile. Omitted fields are left unchanged. */
export type DocumentFileUpdateInput = Record<string, never>

/** Input for creating an InternetLocationFile. */
export type InternetLocationFileCreateInput = Record<string, never>

/** Input for updating an InternetLocationFile. Omitted fields are left unchanged. */
export type InternetLocationFileUpdateInput = Record<string, never>

/** Input for creating a Clipping. */
export type ClippingCreateInput = Record<string, never>

/** Input for updating a Clipping. Omitted fields are left unchanged. */
export type ClippingUpdateInput = Record<string, never>

/** Input for creating a Package. */
export type PackageCreateInput = Record<string, never>

/** Input for updating a Package. Omitted fields are left unchanged. */
export type PackageUpdateInput = Record<string, never>

/** Input for creating a FinderWindow. */
export interface FinderWindowCreateInput {
  /** the container at which this file viewer is targeted */
  target?: string
  /** the current view for the container window */
  currentView?: string
  /** Is the window's toolbar visible? */
  toolbarVisible?: boolean
  /** Is the window's status bar visible? */
  statusbarVisible?: boolean
  /** Is the window's path bar visible? */
  pathbarVisible?: boolean
  /** the width of the sidebar for the container window */
  sidebarWidth?: Integer
}

/** Input for updating a FinderWindow. Omitted fields are left unchanged. */
export interface FinderWindowUpdateInput {
  /**
   * the container at which this file viewer is targeted.
   * Cannot be reset: null is rejected.
   */
  target?: string
  /**
   * the current view for the container window.
   * Cannot be reset: null is rejected.
   */
  currentView?: string
  /**
   * Is the window's toolbar visible?
   * Cannot be reset: null is rejected.
   */
  toolbarVisible?: boolean
  /**
   * Is the window's status bar visible?
   * Cannot be reset: null is rejected.
   */
  statusbarVisible?: boolean
  /**
   * Is the window's path bar visible?
   * Cannot be reset: null is rejected.
   */
  pathbarVisible?: boolean
  /**
   * the width of the sidebar for the container window.
   * Cannot be reset: null is rejected.
   */
  sidebarWidth?: Integer
}

/** Input for creating a ClippingWindow. */
export type ClippingWindowCreateInput = Record<string, never>

/** Input for updating a ClippingWindow. Omitted fields are left unchanged. */
export type ClippingWindowUpdateInput = Record<string, never>

/** Input for creating a ListViewOptions. */
export interface ListViewOptionsCreateInput {
  /** Are folder sizes calculated and displayed in the window? */
  calculatesFolderSizes?: boolean
  /** displays a preview of the item in list view */
  showsIconPreview?: boolean
  /** the size of icons displayed in the list view */
  iconSize?: string
  /** the size of the text displayed in the list view */
  textSize?: Integer
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
  usesRelativeDates?: boolean
}

/** Input for updating a ListViewOptions. Omitted fields are left unchanged. */
export interface ListViewOptionsUpdateInput {
  /**
   * Are folder sizes calculated and displayed in the window?
   * Cannot be reset: null is rejected.
   */
  calculatesFolderSizes?: boolean
  /**
   * displays a preview of the item in list view.
   * Cannot be reset: null is rejected.
   */
  showsIconPreview?: boolean
  /**
   * the size of icons displayed in the list view.
   * Cannot be reset: null is rejected.
   */
  iconSize?: string
  /**
   * the size of the text displayed in the list view.
   * Cannot be reset: null is rejected.
   */
  textSize?: Integer
  /**
   * Are relative dates (e.g., today, yesterday) shown in the list view?
   * Cannot be reset: null is rejected.
   */
  usesRelativeDates?: boolean
}

/** Input for creating a Column. */
export interface ColumnCreateInput {
  /** the index in the front-to-back ordering within its container */
  index?: Integer
  /** The direction in which the window is sorted */
  sortDirection?: string
  /** the width of this column */
  width?: Integer
  /** is this column visible */
  visible?: boolean
}

/** Input for updating a Column. Omitted fields are left unchanged. */
export interface ColumnUpdateInput {
  /**
   * the index in the front-to-back ordering within its container.
   * Cannot be reset: null is rejected.
   */
  index?: Integer
  /**
   * The direction in which the window is sorted.
   * Cannot be reset: null is rejected.
   */
  sortDirection?: string
  /**
   * the width of this column.
   * Cannot be reset: null is rejected.
   */
  width?: Integer
  /**
   * is this column visible.
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
}

/**
 * The Finder client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link finderContract}.
 */
export interface FinderClient {
  /**
   * Open the specified object(s)
   *
   * @param using - the application file to open the object with. Does not accept null.
   * @param withProperties - the initial values for the properties, to be included with the open
   * command sent to the application that opens the direct object. Does not accept null.
   */
  open(using?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /**
   * Print the specified object(s)
   *
   * @param withProperties - optional properties to be included with the print command sent to the
   * application that prints the direct object. Does not accept null.
   */
  print(withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Quit the Finder */
  quit(options?: CallOptions): Promise<void>
  /** Activate the specified window (or the Finder) */
  activate(options?: CallOptions): Promise<void>
  /** Close an object */
  close(options?: CallOptions): Promise<void>
  /**
   * Return the number of elements of a particular class within an object
   *
   * @param each - the class of the elements to be counted. Does not accept null.
   */
  count(each: string, options?: CallOptions): Promise<void>
  /**
   * Return the size in bytes of an object
   *
   * @param as - the data type for which the size is calculated. Does not accept null.
   */
  dataSize(as?: string, options?: CallOptions): Promise<void>
  /** Move an item from its container to the trash */
  _delete(options?: CallOptions): Promise<void>
  /**
   * Duplicate one or more object(s)
   *
   * @param to - the new location for the object(s). Does not accept null.
   * @param replacing - Specifies whether or not to replace items in the destination that have the
   * same name as items being duplicated. Does not accept null.
   * @param routingSuppressed - Specifies whether or not to autoroute items (default is false). Only
   * applies when copying to the system folder. Does not accept null.
   * @param exactCopy - Specifies whether or not to copy permissions/ownership as is. Does not
   * accept null.
   */
  duplicate(
    to?: string,
    replacing?: boolean,
    routingSuppressed?: boolean,
    exactCopy?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Verify if an object exists */
  exists(options?: CallOptions): Promise<void>
  /**
   * Make a new element
   *
   * @param _new - the class of the new element. Does not accept null.
   * @param at - the location at which to insert the element. Does not accept null.
   * @param to - when creating an alias file, the original item to create an alias to or when
   * creating a file viewer window, the target of the window. Does not accept null.
   * @param withProperties - the initial values for the properties of the element. Does not accept
   * null.
   */
  make(
    _new: string,
    at: string,
    to?: string,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Move object(s) to a new location
   *
   * @param to - the new location for the object(s). Does not accept null.
   * @param replacing - Specifies whether or not to replace items in the destination that have the
   * same name as items being moved. Does not accept null.
   * @param positionedAt - Gives a list (in local window coordinates) of positions for the
   * destination items. Does not accept null.
   * @param routingSuppressed - Specifies whether or not to autoroute items (default is false). Only
   * applies when moving to the system folder. Does not accept null.
   */
  move(
    to: string,
    replacing?: boolean,
    positionedAt?: string,
    routingSuppressed?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Select the specified object(s) */
  select(options?: CallOptions): Promise<void>
  /** Private event to open a virtual location */
  openVirtualLocation(options?: CallOptions): Promise<void>
  /**
   * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front
   * application)
   */
  copy(options?: CallOptions): Promise<void>
  /**
   * Return the specified object(s) in a sorted list
   *
   * @param by - the property to sort the items by (name, index, date, etc.). Does not accept null.
   */
  sort(by: string, options?: CallOptions): Promise<void>
  /**
   * Arrange items in window nicely (only applies to open windows in icon view that are not kept
   * arranged)
   *
   * @param by - the order in which to clean up the objects (name, index, date, etc.). Does not
   * accept null.
   */
  cleanUp(by?: string, options?: CallOptions): Promise<void>
  /** Eject the specified disk(s) */
  eject(options?: CallOptions): Promise<void>
  /**
   * Empty the trash
   *
   * @param security - (obsolete). Does not accept null.
   */
  empty(security?: boolean, options?: CallOptions): Promise<void>
  /** (NOT AVAILABLE) Erase the specified disk(s) */
  erase(options?: CallOptions): Promise<void>
  /** Bring the specified object(s) into view */
  reveal(options?: CallOptions): Promise<void>
  /**
   * Update the display of the specified object(s) to match their on-disk representation
   *
   * @param necessity - only update if necessary (i.e. a finder window is open). default is false.
   * Does not accept null.
   * @param registeringApplications - register applications. default is true. Does not accept null.
   */
  update(
    necessity?: boolean,
    registeringApplications?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Restart the computer */
  restart(options?: CallOptions): Promise<void>
  /** Shut Down the computer */
  shutDown(options?: CallOptions): Promise<void>
  /** Put the computer to sleep */
  sleep(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link finderContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type FinderResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link FinderResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies FinderResources

const appOpenOperation: OperationDescriptor<
  { readonly using?: string | undefined; readonly withProperties?: unknown },
  undefined
> = {
  id: 'finder.app.open',
  permission: 'finder:app:open',
  target: { command: 'open' },
  description: 'Open the specified object(s)',
  input: t.record({
    using: t.optional(t.string({ description: 'the application file to open the object with' })),
    withProperties: t.optional(
      t.unknown({
        description:
          'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      using: { type: 'string', description: 'the application file to open the object with' },
      withProperties: {
        allOf: [
          {
            description:
              'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
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

const appPrintOperation: OperationDescriptor<{ readonly withProperties?: unknown }, undefined> = {
  id: 'finder.app.print',
  permission: 'finder:app:print',
  target: { command: 'print' },
  description: 'Print the specified object(s)',
  input: t.record({
    withProperties: t.optional(
      t.unknown({
        description:
          'optional properties to be included with the print command sent to the application that prints the direct object',
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      withProperties: {
        allOf: [
          {
            description:
              'optional properties to be included with the print command sent to the application that prints the direct object',
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

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.quit',
  permission: 'finder:app:quit',
  target: { command: 'quit' },
  description: 'Quit the Finder',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appActivateOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.activate',
  permission: 'finder:app:activate',
  target: { command: 'activate' },
  description: 'Activate the specified window (or the Finder)',
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
  id: 'finder.app.close',
  permission: 'finder:app:close',
  target: { command: 'close' },
  description: 'Close an object',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCountOperation: OperationDescriptor<{ readonly each: string }, undefined> = {
  id: 'finder.app.count',
  permission: 'finder:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object',
  input: t.record({
    each: t.string({ description: 'the class of the elements to be counted' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      each: { type: 'string', description: 'the class of the elements to be counted' },
    },
    required: ['each'],
    additionalProperties: false,
  },
}

const appDataSizeOperation: OperationDescriptor<{ readonly as?: string | undefined }, undefined> = {
  id: 'finder.app.dataSize',
  permission: 'finder:app:dataSize',
  target: { command: 'dataSize' },
  description: 'Return the size in bytes of an object',
  input: t.record({
    as: t.optional(t.string({ description: 'the data type for which the size is calculated' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      as: { type: 'string', description: 'the data type for which the size is calculated' },
    },
    additionalProperties: false,
  },
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.delete',
  permission: 'finder:app:delete',
  target: { command: 'delete' },
  description: 'Move an item from its container to the trash',
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
  {
    readonly to?: string | undefined
    readonly replacing?: boolean | undefined
    readonly routingSuppressed?: boolean | undefined
    readonly exactCopy?: boolean | undefined
  },
  undefined
> = {
  id: 'finder.app.duplicate',
  permission: 'finder:app:duplicate',
  target: { command: 'duplicate' },
  description: 'Duplicate one or more object(s)',
  input: t.record({
    to: t.optional(t.string({ description: 'the new location for the object(s)' })),
    replacing: t.optional(
      t.boolean({
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
      })
    ),
    routingSuppressed: t.optional(
      t.boolean({
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
      })
    ),
    exactCopy: t.optional(
      t.boolean({ description: 'Specifies whether or not to copy permissions/ownership as is' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      to: { type: 'string', description: 'the new location for the object(s)' },
      replacing: {
        type: 'boolean',
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
      },
      routingSuppressed: {
        type: 'boolean',
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
      },
      exactCopy: {
        type: 'boolean',
        description: 'Specifies whether or not to copy permissions/ownership as is',
      },
    },
    additionalProperties: false,
  },
}

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.exists',
  permission: 'finder:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists',
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
    readonly at: string
    readonly to?: string | undefined
    readonly withProperties?: unknown
  },
  undefined
> = {
  id: 'finder.app.make',
  permission: 'finder:app:make',
  target: { command: 'make' },
  description: 'Make a new element',
  input: t.record({
    new: t.string({ description: 'the class of the new element' }),
    at: t.string({ description: 'the location at which to insert the element' }),
    to: t.optional(
      t.string({
        description:
          'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
      })
    ),
    withProperties: t.optional(
      t.unknown({ description: 'the initial values for the properties of the element' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: { type: 'string', description: 'the class of the new element' },
      at: { type: 'string', description: 'the location at which to insert the element' },
      to: {
        type: 'string',
        description:
          'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
      },
      withProperties: {
        allOf: [
          {
            description: 'the initial values for the properties of the element',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['new', 'at'],
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

const appMoveOperation: OperationDescriptor<
  {
    readonly to: string
    readonly replacing?: boolean | undefined
    readonly positionedAt?: string | undefined
    readonly routingSuppressed?: boolean | undefined
  },
  undefined
> = {
  id: 'finder.app.move',
  permission: 'finder:app:move',
  target: { command: 'move' },
  description: 'Move object(s) to a new location',
  input: t.record({
    to: t.string({ description: 'the new location for the object(s)' }),
    replacing: t.optional(
      t.boolean({
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being moved',
      })
    ),
    positionedAt: t.optional(
      t.string({
        description:
          'Gives a list (in local window coordinates) of positions for the destination items',
      })
    ),
    routingSuppressed: t.optional(
      t.boolean({
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      to: { type: 'string', description: 'the new location for the object(s)' },
      replacing: {
        type: 'boolean',
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being moved',
      },
      positionedAt: {
        type: 'string',
        description:
          'Gives a list (in local window coordinates) of positions for the destination items',
      },
      routingSuppressed: {
        type: 'boolean',
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
      },
    },
    required: ['to'],
    additionalProperties: false,
  },
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.select',
  permission: 'finder:app:select',
  target: { command: 'select' },
  description: 'Select the specified object(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appOpenVirtualLocationOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.openVirtualLocation',
  permission: 'finder:app:openVirtualLocation',
  target: { command: 'openVirtualLocation' },
  description: 'Private event to open a virtual location',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCopyOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.copy',
  permission: 'finder:app:copy',
  target: { command: 'copy' },
  description:
    '(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSortOperation: OperationDescriptor<{ readonly by: string }, undefined> = {
  id: 'finder.app.sort',
  permission: 'finder:app:sort',
  target: { command: 'sort' },
  description: 'Return the specified object(s) in a sorted list',
  input: t.record({
    by: t.string({ description: 'the property to sort the items by (name, index, date, etc.)' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      by: {
        type: 'string',
        description: 'the property to sort the items by (name, index, date, etc.)',
      },
    },
    required: ['by'],
    additionalProperties: false,
  },
}

const appCleanUpOperation: OperationDescriptor<{ readonly by?: string | undefined }, undefined> = {
  id: 'finder.app.cleanUp',
  permission: 'finder:app:cleanUp',
  target: { command: 'cleanUp' },
  description:
    'Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)',
  input: t.record({
    by: t.optional(
      t.string({
        description: 'the order in which to clean up the objects (name, index, date, etc.)',
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      by: {
        type: 'string',
        description: 'the order in which to clean up the objects (name, index, date, etc.)',
      },
    },
    additionalProperties: false,
  },
}

const appEjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.eject',
  permission: 'finder:app:eject',
  target: { command: 'eject' },
  description: 'Eject the specified disk(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appEmptyOperation: OperationDescriptor<
  { readonly security?: boolean | undefined },
  undefined
> = {
  id: 'finder.app.empty',
  permission: 'finder:app:empty',
  target: { command: 'empty' },
  description: 'Empty the trash',
  input: t.record({
    security: t.optional(t.boolean({ description: '(obsolete)' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { security: { type: 'boolean', description: '(obsolete)' } },
    additionalProperties: false,
  },
}

const appEraseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.erase',
  permission: 'finder:app:erase',
  target: { command: 'erase' },
  description: '(NOT AVAILABLE) Erase the specified disk(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.reveal',
  permission: 'finder:app:reveal',
  target: { command: 'reveal' },
  description: 'Bring the specified object(s) into view',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appUpdateOperation: OperationDescriptor<
  {
    readonly necessity?: boolean | undefined
    readonly registeringApplications?: boolean | undefined
  },
  undefined
> = {
  id: 'finder.app.update',
  permission: 'finder:app:update',
  target: { command: 'update' },
  description:
    'Update the display of the specified object(s) to match their on-disk representation',
  input: t.record({
    necessity: t.optional(
      t.boolean({
        description: 'only update if necessary (i.e. a finder window is open). default is false',
      })
    ),
    registeringApplications: t.optional(
      t.boolean({ description: 'register applications. default is true' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      necessity: {
        type: 'boolean',
        description: 'only update if necessary (i.e. a finder window is open). default is false',
      },
      registeringApplications: {
        type: 'boolean',
        description: 'register applications. default is true',
      },
    },
    additionalProperties: false,
  },
}

const appRestartOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.restart',
  permission: 'finder:app:restart',
  target: { command: 'restart' },
  description: 'Restart the computer',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appShutDownOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.shutDown',
  permission: 'finder:app:shutDown',
  target: { command: 'shutDown' },
  description: 'Shut Down the computer',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSleepOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.sleep',
  permission: 'finder:app:sleep',
  target: { command: 'sleep' },
  description: 'Put the computer to sleep',
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
const operations: AppContract<FinderClient>['operations'] = {
  'finder.app.open': appOpenOperation,
  'finder.app.print': appPrintOperation,
  'finder.app.quit': appQuitOperation,
  'finder.app.activate': appActivateOperation,
  'finder.app.close': appCloseOperation,
  'finder.app.count': appCountOperation,
  'finder.app.dataSize': appDataSizeOperation,
  'finder.app.delete': appDeleteOperation,
  'finder.app.duplicate': appDuplicateOperation,
  'finder.app.exists': appExistsOperation,
  'finder.app.make': appMakeOperation,
  'finder.app.move': appMoveOperation,
  'finder.app.select': appSelectOperation,
  'finder.app.openVirtualLocation': appOpenVirtualLocationOperation,
  'finder.app.copy': appCopyOperation,
  'finder.app.sort': appSortOperation,
  'finder.app.cleanUp': appCleanUpOperation,
  'finder.app.eject': appEjectOperation,
  'finder.app.empty': appEmptyOperation,
  'finder.app.erase': appEraseOperation,
  'finder.app.reveal': appRevealOperation,
  'finder.app.update': appUpdateOperation,
  'finder.app.restart': appRestartOperation,
  'finder.app.shutDown': appShutDownOperation,
  'finder.app.sleep': appSleepOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): FinderClient {
  return {
    open: (using, withProperties, options) =>
      runtime.invoke(appOpenOperation, { using, withProperties }, options),
    print: (withProperties, options) =>
      runtime.invoke(appPrintOperation, { withProperties }, options),
    quit: (options) => runtime.invoke(appQuitOperation, {}, options),
    activate: (options) => runtime.invoke(appActivateOperation, {}, options),
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    dataSize: (as, options) => runtime.invoke(appDataSizeOperation, { as }, options),
    _delete: (options) => runtime.invoke(appDeleteOperation, {}, options),
    duplicate: (to, replacing, routingSuppressed, exactCopy, options) =>
      runtime.invoke(
        appDuplicateOperation,
        { to, replacing, routingSuppressed, exactCopy },
        options
      ),
    exists: (options) => runtime.invoke(appExistsOperation, {}, options),
    make: (_new, at, to, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, at, to, withProperties }, options),
    move: (to, replacing, positionedAt, routingSuppressed, options) =>
      runtime.invoke(appMoveOperation, { to, replacing, positionedAt, routingSuppressed }, options),
    select: (options) => runtime.invoke(appSelectOperation, {}, options),
    openVirtualLocation: (options) => runtime.invoke(appOpenVirtualLocationOperation, {}, options),
    copy: (options) => runtime.invoke(appCopyOperation, {}, options),
    sort: (by, options) => runtime.invoke(appSortOperation, { by }, options),
    cleanUp: (by, options) => runtime.invoke(appCleanUpOperation, { by }, options),
    eject: (options) => runtime.invoke(appEjectOperation, {}, options),
    empty: (security, options) => runtime.invoke(appEmptyOperation, { security }, options),
    erase: (options) => runtime.invoke(appEraseOperation, {}, options),
    reveal: (options) => runtime.invoke(appRevealOperation, {}, options),
    update: (necessity, registeringApplications, options) =>
      runtime.invoke(appUpdateOperation, { necessity, registeringApplications }, options),
    restart: (options) => runtime.invoke(appRestartOperation, {}, options),
    shutDown: (options) => runtime.invoke(appShutDownOperation, {}, options),
    sleep: (options) => runtime.invoke(appSleepOperation, {}, options),
  }
}

/**
 * The Finder contract. Pass it to a client factory to obtain a
 * {@link FinderClient}.
 */
export const finderContract: AppContract<FinderClient, FinderResources> = {
  app: 'finder',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

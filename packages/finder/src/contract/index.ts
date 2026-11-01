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
  type ValueType,
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
  /** the entire contents of the container, including the contents of its children */
  readonly entireContents: string
  /** (NOT AVAILABLE YET) Is the container capable of being expanded as an outline? */
  readonly expandable: boolean
  /**
   * (NOT AVAILABLE YET) Is the container opened as an outline? (can only be set for containers
   * viewed as lists)
   */
  expanded: boolean
  /**
   * (NOT AVAILABLE YET) Are the container and all of its children opened as outlines? (can only be
   * set for containers viewed as lists)
   */
  completelyExpanded: boolean
  /** the container window for this folder */
  readonly containerWindow: string
}

/** A disk */
export interface Disk {
  /**
   * the unique id for this disk (unchanged while disk remains connected and Finder remains running)
   */
  readonly id: Integer
  /** the total number of bytes (free or used) on the disk */
  readonly capacity: number
  /** the number of free bytes left on the disk */
  readonly freeSpace: number
  /** Can the media be ejected (floppies, CDs, and so on)? */
  readonly ejectable: boolean
  /** Is the media a local volume (as opposed to a file server)? */
  readonly localVolume: boolean
  /** Is this disk the boot disk? */
  readonly startup: boolean
  /** the filesystem format of this disk */
  readonly format: string
  /** Does this disk do file system journaling? */
  readonly journalingEnabled: boolean
  /** Ignore permissions on this disk? */
  ignorePrivileges: boolean
}

/** A folder */
export interface Folder {
  /** Unique identifier for this folder */
  readonly id: Integer
}

/** Desktop-object is the class of the "desktop" object */
export interface DesktopObject {
  /** Unique identifier for the desktop */
  readonly id: Integer
}

/** Trash-object is the class of the “trash” object */
export interface TrashObject {
  /** Display a dialog when emptying the trash? */
  warnsBeforeEmptying: boolean
}

/** A file */
export interface File {
  /** the OSType identifying the type of data contained in the item */
  fileType: string
  /** the OSType identifying the application that created the item */
  creatorType: string
  /** Is the file a stationery pad? */
  stationery: boolean
  /** the version of the product (visible at the top of the “Get Info” window) */
  readonly productVersion: string
  /** the version of the file (visible at the bottom of the “Get Info” window) */
  readonly version: string
}

/** An alias file (created with “Make Alias”) */
export interface AliasFile {
  /** the original item pointed to by the alias */
  originalItem: string
}

/** An application's file on disk */
export interface ApplicationFile {
  /** the bundle identifier or creator type of the application */
  readonly id: string
  /**
   * (AVAILABLE IN 10.1 TO 10.4) the memory size with which the developer recommends the application
   * be launched
   */
  readonly suggestedSize: Integer
  /**
   * (AVAILABLE IN 10.1 TO 10.4) the smallest memory size with which the application can be launched
   */
  minimumSize: Integer
  /** (AVAILABLE IN 10.1 TO 10.4) the memory size with which the application will be launched */
  preferredSize: Integer
  /** Is the application high-level event aware? (OBSOLETE: always returns true) */
  readonly acceptsHighLevelEvents: boolean
  /** Does the process have a scripting terminology, i.e., can it be scripted? */
  readonly hasScriptingTerminology: boolean
  /** (AVAILABLE IN 10.1 TO 10.4) Should the application launch in the Classic environment? */
  opensInClassic: boolean
}

/** A document file */
export interface DocumentFile {
  /** Unique identifier for this document */
  readonly id: Integer
}

/** A file containing an internet location */
export interface InternetLocationFile {
  /** the internet location */
  readonly location: string
}

/** A clipping */
export interface Clipping {
  /** (NOT AVAILABLE YET) the clipping window for this clipping */
  readonly clippingWindow: string
}

/** A package */
export interface Package {
  /** Unique identifier for this package */
  readonly id: Integer
}

/** A file viewer window */
export interface FinderWindow {
  /** the container at which this file viewer is targeted */
  target: string
  /** the current view for the container window */
  currentView: string
  /** the icon view options for the container window */
  readonly iconViewOptions: unknown
  /** the list view options for the container window */
  readonly listViewOptions: ObjectReferenceVariant<ListViewOptions, never>
  /** the column view options for the container window */
  readonly columnViewOptions: unknown
  /** Is the window's toolbar visible? */
  toolbarVisible: boolean
  /** Is the window's status bar visible? */
  statusbarVisible: boolean
  /** Is the window's path bar visible? */
  pathbarVisible: boolean
  /** the width of the sidebar for the container window */
  sidebarWidth: Integer
}

/** The window containing a clipping */
export interface ClippingWindow {
  /** Unique identifier for this window */
  readonly id: Integer
}

/** the list view options */
export interface ListViewOptions {
  /** Are folder sizes calculated and displayed in the window? */
  calculatesFolderSizes: boolean
  /** displays a preview of the item in list view */
  showsIconPreview: boolean
  /** the size of icons displayed in the list view */
  iconSize: string
  /** the size of the text displayed in the list view */
  textSize: Integer
  /** the column that the list view is sorted on */
  sortColumn: ObjectReferenceVariant<Column, never>
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
  usesRelativeDates: boolean
}

/** a column of a list view */
export interface Column {
  /** the index in the front-to-back ordering within its container */
  index: Integer
  /** the column name */
  readonly name: string
  /** The direction in which the window is sorted */
  sortDirection: string
  /** the width of this column */
  width: Integer
  /** the minimum allowed width of this column */
  readonly minimumWidth: Integer
  /** the maximum allowed width of this column */
  readonly maximumWidth: Integer
  /** is this column visible */
  visible: boolean
}

/** Input for creating a Container. */
export interface ContainerCreateInput {
  /**
   * (NOT AVAILABLE YET) Is the container opened as an outline? (can only be set for containers
   * viewed as lists)
   */
  expanded?: boolean
  /**
   * (NOT AVAILABLE YET) Are the container and all of its children opened as outlines? (can only be
   * set for containers viewed as lists)
   */
  completelyExpanded?: boolean
}

/** Input for updating a Container. Omitted fields are left unchanged. */
export interface ContainerUpdateInput {
  /**
   * (NOT AVAILABLE YET) Is the container opened as an outline? (can only be set for containers
   * viewed as lists)
   */
  expanded?: boolean
  /**
   * (NOT AVAILABLE YET) Are the container and all of its children opened as outlines? (can only be
   * set for containers viewed as lists)
   */
  completelyExpanded?: boolean
}

/** Input for creating a Disk. */
export interface DiskCreateInput {
  /** Ignore permissions on this disk? */
  ignorePrivileges?: boolean
}

/** Input for updating a Disk. Omitted fields are left unchanged. */
export interface DiskUpdateInput {
  /** Ignore permissions on this disk? */
  ignorePrivileges?: boolean
}

/** Input for creating a Folder. */
export type FolderCreateInput = Record<string, never>

/** Input for updating a Folder. Omitted fields are left unchanged. */
export type FolderUpdateInput = Record<string, never>

/** Input for creating a DesktopObject. */
export type DesktopObjectCreateInput = Record<string, never>

/** Input for updating a DesktopObject. Omitted fields are left unchanged. */
export type DesktopObjectUpdateInput = Record<string, never>

/** Input for creating a TrashObject. */
export interface TrashObjectCreateInput {
  /** Display a dialog when emptying the trash? */
  warnsBeforeEmptying?: boolean
}

/** Input for updating a TrashObject. Omitted fields are left unchanged. */
export interface TrashObjectUpdateInput {
  /** Display a dialog when emptying the trash? */
  warnsBeforeEmptying?: boolean
}

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
  /** the OSType identifying the type of data contained in the item */
  fileType?: string
  /** the OSType identifying the application that created the item */
  creatorType?: string
  /** Is the file a stationery pad? */
  stationery?: boolean
}

/** Input for creating an AliasFile. */
export interface AliasFileCreateInput {
  /** the original item pointed to by the alias */
  originalItem?: string
}

/** Input for updating an AliasFile. Omitted fields are left unchanged. */
export interface AliasFileUpdateInput {
  /** the original item pointed to by the alias */
  originalItem?: string
}

/** Input for creating an ApplicationFile. */
export interface ApplicationFileCreateInput {
  /**
   * (AVAILABLE IN 10.1 TO 10.4) the smallest memory size with which the application can be launched
   */
  minimumSize?: Integer
  /** (AVAILABLE IN 10.1 TO 10.4) the memory size with which the application will be launched */
  preferredSize?: Integer
  /** (AVAILABLE IN 10.1 TO 10.4) Should the application launch in the Classic environment? */
  opensInClassic?: boolean
}

/** Input for updating an ApplicationFile. Omitted fields are left unchanged. */
export interface ApplicationFileUpdateInput {
  /**
   * (AVAILABLE IN 10.1 TO 10.4) the smallest memory size with which the application can be launched
   */
  minimumSize?: Integer
  /** (AVAILABLE IN 10.1 TO 10.4) the memory size with which the application will be launched */
  preferredSize?: Integer
  /** (AVAILABLE IN 10.1 TO 10.4) Should the application launch in the Classic environment? */
  opensInClassic?: boolean
}

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
  /** the column that the list view is sorted on */
  sortColumn?: ObjectReferenceVariant<Column, never>
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
  usesRelativeDates?: boolean
}

/** Input for updating a ListViewOptions. Omitted fields are left unchanged. */
export interface ListViewOptionsUpdateInput {
  /** Are folder sizes calculated and displayed in the window? */
  calculatesFolderSizes?: boolean
  /** displays a preview of the item in list view */
  showsIconPreview?: boolean
  /** the size of icons displayed in the list view */
  iconSize?: string
  /** the size of the text displayed in the list view */
  textSize?: Integer
  /** the column that the list view is sorted on */
  sortColumn?: ObjectReferenceVariant<Column, never>
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
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
  /** the index in the front-to-back ordering within its container */
  index?: Integer
  /** The direction in which the window is sorted */
  sortDirection?: string
  /** the width of this column */
  width?: Integer
  /** is this column visible */
  visible?: boolean
}

/**
 * The Finder client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link finderContract}.
 */
export interface FinderClient {
  /** Open the specified object(s) */
  open(using?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Print the specified object(s) */
  print(withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Quit the Finder */
  quit(options?: CallOptions): Promise<void>
  /** Activate the specified window (or the Finder) */
  activate(options?: CallOptions): Promise<void>
  /** Close an object */
  close(options?: CallOptions): Promise<void>
  /** Return the number of elements of a particular class within an object */
  count(each: string, options?: CallOptions): Promise<void>
  /** Return the size in bytes of an object */
  dataSize(as?: string, options?: CallOptions): Promise<void>
  /** Move an item from its container to the trash */
  _delete(options?: CallOptions): Promise<void>
  /** Duplicate one or more object(s) */
  duplicate(
    to?: string,
    replacing?: boolean,
    routingSuppressed?: boolean,
    exactCopy?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Verify if an object exists */
  exists(options?: CallOptions): Promise<void>
  /** Make a new element */
  make(
    _new: string,
    at: string,
    to?: string,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /** Move object(s) to a new location */
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
  /** Return the specified object(s) in a sorted list */
  sort(by: string, options?: CallOptions): Promise<void>
  /**
   * Arrange items in window nicely (only applies to open windows in icon view that are not kept
   * arranged)
   */
  cleanUp(by?: string, options?: CallOptions): Promise<void>
  /** Eject the specified disk(s) */
  eject(options?: CallOptions): Promise<void>
  /** Empty the trash */
  empty(security?: boolean, options?: CallOptions): Promise<void>
  /** (NOT AVAILABLE) Erase the specified disk(s) */
  erase(options?: CallOptions): Promise<void>
  /** Bring the specified object(s) into view */
  reveal(options?: CallOptions): Promise<void>
  /** Update the display of the specified object(s) to match their on-disk representation */
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

const containerRecordType: ValueType<Container> = t.record(
  {
    entireContents: t.string({
      description: 'the entire contents of the container, including the contents of its children',
    }),
    expandable: t.boolean({
      description: '(NOT AVAILABLE YET) Is the container capable of being expanded as an outline?',
    }),
    expanded: t.boolean({
      description:
        '(NOT AVAILABLE YET) Is the container opened as an outline? (can only be set for containers viewed as lists)',
    }),
    completelyExpanded: t.boolean({
      description:
        '(NOT AVAILABLE YET) Are the container and all of its children opened as outlines? (can only be set for containers viewed as lists)',
    }),
    containerWindow: t.string({ description: 'the container window for this folder' }),
  },
  { description: 'An item that contains other items' }
)

const diskRecordType: ValueType<Disk> = t.record(
  {
    id: t.integer({
      description:
        'the unique id for this disk (unchanged while disk remains connected and Finder remains running)',
    }),
    capacity: t.double({ description: 'the total number of bytes (free or used) on the disk' }),
    freeSpace: t.double({ description: 'the number of free bytes left on the disk' }),
    ejectable: t.boolean({ description: 'Can the media be ejected (floppies, CDs, and so on)?' }),
    localVolume: t.boolean({
      description: 'Is the media a local volume (as opposed to a file server)?',
    }),
    startup: t.boolean({ description: 'Is this disk the boot disk?' }),
    format: t.string({ description: 'the filesystem format of this disk' }),
    journalingEnabled: t.boolean({ description: 'Does this disk do file system journaling?' }),
    ignorePrivileges: t.boolean({ description: 'Ignore permissions on this disk?' }),
  },
  { description: 'A disk' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this folder' }),
  },
  { description: 'A folder' }
)

const desktopObjectRecordType: ValueType<DesktopObject> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for the desktop' }),
  },
  { description: 'Desktop-object is the class of the "desktop" object' }
)

const trashObjectRecordType: ValueType<TrashObject> = t.record(
  {
    warnsBeforeEmptying: t.boolean({ description: 'Display a dialog when emptying the trash?' }),
  },
  { description: 'Trash-object is the class of the “trash” object' }
)

const fileRecordType: ValueType<File> = t.record(
  {
    fileType: t.string({
      description: 'the OSType identifying the type of data contained in the item',
    }),
    creatorType: t.string({
      description: 'the OSType identifying the application that created the item',
    }),
    stationery: t.boolean({ description: 'Is the file a stationery pad?' }),
    productVersion: t.string({
      description: 'the version of the product (visible at the top of the “Get Info” window)',
    }),
    version: t.string({
      description: 'the version of the file (visible at the bottom of the “Get Info” window)',
    }),
  },
  { description: 'A file' }
)

const aliasFileRecordType: ValueType<AliasFile> = t.record(
  {
    originalItem: t.string({ description: 'the original item pointed to by the alias' }),
  },
  { description: 'An alias file (created with “Make Alias”)' }
)

const applicationFileRecordType: ValueType<ApplicationFile> = t.record(
  {
    id: t.string({ description: 'the bundle identifier or creator type of the application' }),
    suggestedSize: t.integer({
      description:
        '(AVAILABLE IN 10.1 TO 10.4) the memory size with which the developer recommends the application be launched',
    }),
    minimumSize: t.integer({
      description:
        '(AVAILABLE IN 10.1 TO 10.4) the smallest memory size with which the application can be launched',
    }),
    preferredSize: t.integer({
      description:
        '(AVAILABLE IN 10.1 TO 10.4) the memory size with which the application will be launched',
    }),
    acceptsHighLevelEvents: t.boolean({
      description: 'Is the application high-level event aware? (OBSOLETE: always returns true)',
    }),
    hasScriptingTerminology: t.boolean({
      description: 'Does the process have a scripting terminology, i.e., can it be scripted?',
    }),
    opensInClassic: t.boolean({
      description:
        '(AVAILABLE IN 10.1 TO 10.4) Should the application launch in the Classic environment?',
    }),
  },
  { description: "An application's file on disk" }
)

const documentFileRecordType: ValueType<DocumentFile> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this document' }),
  },
  { description: 'A document file' }
)

const internetLocationFileRecordType: ValueType<InternetLocationFile> = t.record(
  {
    location: t.string({ description: 'the internet location' }),
  },
  { description: 'A file containing an internet location' }
)

const clippingRecordType: ValueType<Clipping> = t.record(
  {
    clippingWindow: t.string({
      description: '(NOT AVAILABLE YET) the clipping window for this clipping',
    }),
  },
  { description: 'A clipping' }
)

const packageRecordType: ValueType<Package> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this package' }),
  },
  { description: 'A package' }
)

const finderWindowRecordType: ValueType<FinderWindow> = t.record(
  {
    target: t.string({ description: 'the container at which this file viewer is targeted' }),
    currentView: t.string({ description: 'the current view for the container window' }),
    iconViewOptions: t.unknown({ description: 'the icon view options for the container window' }),
    listViewOptions: t.reference<ListViewOptions, never>(
      () => resources,
      'ListViewOptions',
      'one',
      { description: 'the list view options for the container window' }
    ),
    columnViewOptions: t.unknown({
      description: 'the column view options for the container window',
    }),
    toolbarVisible: t.boolean({ description: "Is the window's toolbar visible?" }),
    statusbarVisible: t.boolean({ description: "Is the window's status bar visible?" }),
    pathbarVisible: t.boolean({ description: "Is the window's path bar visible?" }),
    sidebarWidth: t.integer({ description: 'the width of the sidebar for the container window' }),
  },
  { description: 'A file viewer window' }
)

const clippingWindowRecordType: ValueType<ClippingWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
  },
  { description: 'The window containing a clipping' }
)

const listViewOptionsRecordType: ValueType<ListViewOptions> = t.record(
  {
    calculatesFolderSizes: t.boolean({
      description: 'Are folder sizes calculated and displayed in the window?',
    }),
    showsIconPreview: t.boolean({ description: 'displays a preview of the item in list view' }),
    iconSize: t.string({ description: 'the size of icons displayed in the list view' }),
    textSize: t.integer({ description: 'the size of the text displayed in the list view' }),
    sortColumn: t.reference<Column, never>(() => resources, 'Column', 'one', {
      description: 'the column that the list view is sorted on',
    }),
    usesRelativeDates: t.boolean({
      description: 'Are relative dates (e.g., today, yesterday) shown in the list view?',
    }),
  },
  { description: 'the list view options' }
)

const columnRecordType: ValueType<Column> = t.record(
  {
    index: t.integer({
      description: 'the index in the front-to-back ordering within its container',
    }),
    name: t.string({ description: 'the column name' }),
    sortDirection: t.string({ description: 'The direction in which the window is sorted' }),
    width: t.integer({ description: 'the width of this column' }),
    minimumWidth: t.integer({ description: 'the minimum allowed width of this column' }),
    maximumWidth: t.integer({ description: 'the maximum allowed width of this column' }),
    visible: t.boolean({ description: 'is this column visible' }),
  },
  { description: 'a column of a list view' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<FinderClient>['resources'] = {
  Container: {
    name: 'Container',
    record: containerRecordType,
  },
  Disk: {
    name: 'Disk',
    record: diskRecordType,
    id: t.integer({
      description:
        'the unique id for this disk (unchanged while disk remains connected and Finder remains running)',
    }),
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
  },
  DesktopObject: {
    name: 'DesktopObject',
    record: desktopObjectRecordType,
  },
  TrashObject: {
    name: 'TrashObject',
    record: trashObjectRecordType,
  },
  File: {
    name: 'File',
    record: fileRecordType,
  },
  AliasFile: {
    name: 'AliasFile',
    record: aliasFileRecordType,
  },
  ApplicationFile: {
    name: 'ApplicationFile',
    record: applicationFileRecordType,
    id: t.string({ description: 'the bundle identifier or creator type of the application' }),
  },
  DocumentFile: {
    name: 'DocumentFile',
    record: documentFileRecordType,
  },
  InternetLocationFile: {
    name: 'InternetLocationFile',
    record: internetLocationFileRecordType,
  },
  Clipping: {
    name: 'Clipping',
    record: clippingRecordType,
  },
  Package: {
    name: 'Package',
    record: packageRecordType,
  },
  FinderWindow: {
    name: 'FinderWindow',
    record: finderWindowRecordType,
  },
  ClippingWindow: {
    name: 'ClippingWindow',
    record: clippingWindowRecordType,
  },
  ListViewOptions: {
    name: 'ListViewOptions',
    record: listViewOptionsRecordType,
  },
  Column: {
    name: 'Column',
    record: columnRecordType,
  },
}

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
}

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.quit',
  permission: 'finder:app:quit',
  target: { command: 'quit' },
  description: 'Quit the Finder',
  input: t.record({}),
  output: t.none(),
}

const appActivateOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.activate',
  permission: 'finder:app:activate',
  target: { command: 'activate' },
  description: 'Activate the specified window (or the Finder)',
  input: t.record({}),
  output: t.none(),
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.close',
  permission: 'finder:app:close',
  target: { command: 'close' },
  description: 'Close an object',
  input: t.record({}),
  output: t.none(),
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
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.delete',
  permission: 'finder:app:delete',
  target: { command: 'delete' },
  description: 'Move an item from its container to the trash',
  input: t.record({}),
  output: t.none(),
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
}

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.exists',
  permission: 'finder:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists',
  input: t.record({}),
  output: t.none(),
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
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.select',
  permission: 'finder:app:select',
  target: { command: 'select' },
  description: 'Select the specified object(s)',
  input: t.record({}),
  output: t.none(),
}

const appOpenVirtualLocationOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.openVirtualLocation',
  permission: 'finder:app:openVirtualLocation',
  target: { command: 'openVirtualLocation' },
  description: 'Private event to open a virtual location',
  input: t.record({}),
  output: t.none(),
}

const appCopyOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.copy',
  permission: 'finder:app:copy',
  target: { command: 'copy' },
  description:
    '(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)',
  input: t.record({}),
  output: t.none(),
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
}

const appEjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.eject',
  permission: 'finder:app:eject',
  target: { command: 'eject' },
  description: 'Eject the specified disk(s)',
  input: t.record({}),
  output: t.none(),
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
}

const appEraseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.erase',
  permission: 'finder:app:erase',
  target: { command: 'erase' },
  description: '(NOT AVAILABLE) Erase the specified disk(s)',
  input: t.record({}),
  output: t.none(),
}

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.reveal',
  permission: 'finder:app:reveal',
  target: { command: 'reveal' },
  description: 'Bring the specified object(s) into view',
  input: t.record({}),
  output: t.none(),
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
}

const appRestartOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.restart',
  permission: 'finder:app:restart',
  target: { command: 'restart' },
  description: 'Restart the computer',
  input: t.record({}),
  output: t.none(),
}

const appShutDownOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.shutDown',
  permission: 'finder:app:shutDown',
  target: { command: 'shutDown' },
  description: 'Shut Down the computer',
  input: t.record({}),
  output: t.none(),
}

const appSleepOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'finder.app.sleep',
  permission: 'finder:app:sleep',
  target: { command: 'sleep' },
  description: 'Put the computer to sleep',
  input: t.record({}),
  output: t.none(),
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
export const finderContract: AppContract<FinderClient> = {
  app: 'finder',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

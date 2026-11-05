/**
 * The System Events contract: the transport-neutral description of every
 * System Events operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `SystemEventsClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `SystemEventsClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the System Events manifest; do not edit.
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
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Page,
  type Rectangle,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** SaveableFileFormat */
export type SaveableFileFormat = 'text'

/** ScrollPageBehaviors */
export type ScrollPageBehaviors = 'jumpToHere' | 'jumpToNextPage'

/** FontSmoothingStyles */
export type FontSmoothingStyles = 'automatic' | 'light' | 'medium' | 'standard' | 'strong'

/** Appearances */
export type Appearances = 'blue' | 'graphite'

/** HighlightColors */
export type HighlightColors =
  | 'blue'
  | 'gold'
  | 'graphite'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'silver'

/** Dhac */
export type Dhac = 'askWhatToDo' | 'ignore' | 'openApplication' | 'runAScript'

/** DynamicStyle */
export type DynamicStyle = 'auto' | 'dynamic' | 'light' | 'dark' | 'unknown'

/** Dpls */
export type Dpls = 'bottom' | 'left' | 'right'

/** Dpef */
export type Dpef = 'genie' | 'scale'

/** Dpbh */
export type Dpbh = 'minimize' | 'off' | 'zoom'

/** Edfm */
export type Edfm =
  | 'applePhotoFormat'
  | 'appleShareFormat'
  | 'audioFormat'
  | 'highSierraFormat'
  | '9660'
  | 'macOSExtendedFormat'
  | 'macOSFormat'
  | 'mSDOSFormat'
  | 'nFSFormat'
  | 'proDOSFormat'
  | 'quickTakeFormat'
  | 'uDFFormat'
  | 'uFSFormat'
  | 'unknownFormat'
  | 'webDAVFormat'

/** EMds */
export type EMds = 'commandDown' | 'controlDown' | 'optionDown' | 'shiftDown'

/** EMky */
export type EMky = 'command' | 'control' | 'option' | 'shift'

/** Enum */
export type Enum = 'standard' | 'detailed'

/** Actn */
export type Actn = 'itemsAdded' | 'itemsRemoved' | 'windowClosed' | 'windowMoved' | 'windowOpened'

/** Accs */
export type Accs = 'none' | 'readOnly' | 'readWrite' | 'writeOnly'

/** The kinds of ClassicDomainObject: each names the application property that holds one. */
export type ClassicDomainObjectKind = 'classic'

/** The kinds of UserDomainObject: each names the application property that holds one. */
export type UserDomainObjectKind = 'user'

/** A collection of settings for configuring a connection */
export interface Configuration {
  /**
   * the name used to authenticate.
   * Nullable. No evidence that the app always sets it.
   */
  accountName: string | null
  /**
   * Is the configuration connected?
   * Nullable. No evidence that the app always sets it.
   */
  readonly connected: boolean | null
  /**
   * the unique identifier for the configuration.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the name of the configuration.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** A collection of settings for a network interface */
export interface Interface {
  /**
   * configure the interface speed, duplex, and mtu automatically?
   * Nullable. No evidence that the app always sets it.
   */
  automatic: boolean | null
  /**
   * the duplex setting  half | full | full with flow control.
   * Nullable. No evidence that the app always sets it.
   */
  duplex: string | null
  /**
   * the unique identifier for the interface.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the type of interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the MAC address for the interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly mACAddress: string | null
  /**
   * the packet size.
   * Nullable. No evidence that the app always sets it.
   */
  mtu: Integer | null
  /**
   * the name of the interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * ethernet speed 10 | 100 | 1000.
   * Nullable. No evidence that the app always sets it.
   */
  speed: Integer | null
}

/** A set of services */
export interface Location {
  /**
   * the unique identifier for the location.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the name of the location.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
}

/** the preferences for the current user's network */
export type NetworkPreferencesObject = Record<string, never>

/** A collection of settings for a network service */
export interface Service {
  /**
   * Is the service active?
   * Nullable. No evidence that the app always sets it.
   */
  readonly active: boolean | null
  /**
   * the unique identifier for the service.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the type of service.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: Integer | null
  /**
   * the name of the service.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
}

/** An alias in the file system */
export interface Alias {
  /**
   * the OSType identifying the application that created the alias.
   * Nullable. No evidence that the app always sets it.
   */
  creatorType: string | null
  /**
   * the application that will launch if the alias is opened.
   * Nullable. No evidence that the app always sets it.
   */
  defaultApplication: string | null
  /**
   * the OSType identifying the type of data contained in the alias.
   * Nullable. No evidence that the app always sets it.
   */
  fileType: string | null
  /**
   * The kind of alias, as shown in Finder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the version of the product (visible at the top of the "Get Info" window).
   * Nullable. No evidence that the app always sets it.
   */
  readonly productVersion: string | null
  /**
   * the short version of the application bundle referenced by the alias.
   * Nullable. No evidence that the app always sets it.
   */
  readonly shortVersion: string | null
  /**
   * Is the alias a stationery pad?
   * Nullable. No evidence that the app always sets it.
   */
  stationery: boolean | null
  /**
   * The type identifier of the alias.
   * Nullable. No evidence that the app always sets it.
   */
  readonly typeIdentifier: string | null
  /**
   * the version of the application bundle referenced by the alias (visible at the bottom of the
   * "Get Info" window).
   * Nullable. No evidence that the app always sets it.
   */
  readonly version: string | null
}

/** The Classic domain in the file system */
export interface ClassicDomainObject {
  /**
   * The Classic Preferences folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly preferencesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * Which ClassicDomainObject this is: the kind naming the application property that holds it.
   * Never null: the primary identifier.
   */
  readonly kind: ClassicDomainObjectKind
  /**
   * The Application Support folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationSupportFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Applications folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the unique identifier of the domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * The Library folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly libraryFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the name of the domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The Scripts folder.
   * Nullable. The app reported no value in 2 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly scriptsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Automator Workflows folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly workflowsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
}

/** A disk in the file system */
export interface Disk {
  /**
   * the total number of bytes (free or used) on the disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly capacity: number | null
  /**
   * Can the media be ejected (floppies, CD's, and so on)?
   * Nullable. No evidence that the app always sets it.
   */
  readonly ejectable: boolean | null
  /**
   * the file system format of this disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly format: string | null
  /**
   * the number of free bytes left on the disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly freeSpace: number | null
  /**
   * Ignore permissions on this disk?
   * Nullable. No evidence that the app always sets it.
   */
  ignorePrivileges: boolean | null
  /**
   * Is the media a local volume (as opposed to a file server)?
   * Nullable. No evidence that the app always sets it.
   */
  readonly localVolume: boolean | null
  /**
   * the server on which the disk resides, AFP volumes only.
   * Nullable. No evidence that the app always sets it.
   */
  readonly server: string | null
  /**
   * Is this disk the boot disk?
   * Nullable. No evidence that the app always sets it.
   */
  readonly startup: boolean | null
  /**
   * the zone in which the disk's server resides, AFP volumes only.
   * Nullable. No evidence that the app always sets it.
   */
  readonly zone: string | null
}

/** An item stored in the file system */
export interface DiskItem {
  /**
   * Is the disk item busy?
   * Nullable. No evidence that the app always sets it.
   */
  readonly busyStatus: boolean | null
  /**
   * the folder or disk which has this disk item as an element.
   * Nullable. No evidence that the app always sets it.
   */
  readonly container: ObjectReferenceVariant<DiskItem, string, 'DiskItem'> | null
  /**
   * the date on which the disk item was created.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * the name of the disk item as displayed in the User Interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly displayedName: string | null
  /**
   * the unique ID of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * the date on which the disk item was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  modificationDate: Date | null
  /**
   * the name of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * the extension portion of the name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly nameExtension: string | null
  /**
   * Is the disk item a package?
   * Nullable. No evidence that the app always sets it.
   */
  readonly packageFolder: boolean | null
  /**
   * the file system path of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * the actual space used by the disk item on disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly physicalSize: Integer | null
  /**
   * the POSIX file system path of the disk item.
   * Never null: the primary identifier.
   */
  readonly posixPath: string
  /**
   * the logical size of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly size: Integer | null
  /**
   * the URL of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly uRL: string | null
  /**
   * Is the disk item visible?
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * the volume on which the disk item resides.
   * Nullable. No evidence that the app always sets it.
   */
  readonly volume: string | null
}

/** A domain in the file system */
export interface Domain {
  /**
   * The Application Support folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationSupportFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Applications folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Desktop Pictures folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly desktopPicturesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Folder Action Scripts folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly folderActionScriptsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Fonts folder.
   * Nullable. The app reported no value in 2 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly fontsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the unique identifier of the domain.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The Library folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly libraryFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the name of the domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The Preferences folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly preferencesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Scripting Additions folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly scriptingAdditionsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Scripts folder.
   * Nullable. The app reported no value in 2 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly scriptsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Shared Documents folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly sharedDocumentsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Speakable Items folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly speakableItemsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Utilities folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly utilitiesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Automator Workflows folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly workflowsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
}

/** A file in the file system */
export interface File {
  /**
   * the OSType identifying the application that created the file.
   * Nullable. No evidence that the app always sets it.
   */
  creatorType: string | null
  /**
   * the application that will launch if the file is opened.
   * Nullable. No evidence that the app always sets it.
   */
  defaultApplication: string | null
  /**
   * the OSType identifying the type of data contained in the file.
   * Nullable. No evidence that the app always sets it.
   */
  fileType: string | null
  /**
   * The kind of file, as shown in Finder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the version of the product (visible at the top of the "Get Info" window).
   * Nullable. No evidence that the app always sets it.
   */
  readonly productVersion: string | null
  /**
   * the short version of the file.
   * Nullable. No evidence that the app always sets it.
   */
  readonly shortVersion: string | null
  /**
   * Is the file a stationery pad?
   * Nullable. No evidence that the app always sets it.
   */
  stationery: boolean | null
  /**
   * The type identifier of the file.
   * Nullable. No evidence that the app always sets it.
   */
  readonly typeIdentifier: string | null
  /**
   * the version of the file (visible at the bottom of the "Get Info" window).
   * Nullable. No evidence that the app always sets it.
   */
  readonly version: string | null
}

/** A file package in the file system */
export interface FilePackage {
  /**
   * Unique identifier for this package.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A folder in the file system */
export interface Folder {
  /**
   * Is the disk item busy?
   * Nullable. No evidence that the app always sets it.
   */
  readonly busyStatus: boolean | null
  /**
   * the folder or disk which has this disk item as an element.
   * Nullable. No evidence that the app always sets it.
   */
  readonly container: ObjectReferenceVariant<DiskItem, string, 'DiskItem'> | null
  /**
   * the date on which the disk item was created.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * the name of the disk item as displayed in the User Interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly displayedName: string | null
  /**
   * the unique ID of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * the date on which the disk item was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  modificationDate: Date | null
  /**
   * the name of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * the extension portion of the name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly nameExtension: string | null
  /**
   * Is the disk item a package?
   * Nullable. No evidence that the app always sets it.
   */
  readonly packageFolder: boolean | null
  /**
   * the file system path of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * the actual space used by the disk item on disk.
   * Nullable. No evidence that the app always sets it.
   */
  readonly physicalSize: Integer | null
  /**
   * the POSIX file system path of the disk item.
   * Never null: the primary identifier.
   */
  readonly posixPath: string
  /**
   * the logical size of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly size: Integer | null
  /**
   * the URL of the disk item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly uRL: string | null
  /**
   * Is the disk item visible?
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * the volume on which the disk item resides.
   * Nullable. No evidence that the app always sets it.
   */
  readonly volume: string | null
}

/** The local domain in the file system */
export interface LocalDomainObject {
  /**
   * Unique identifier for this domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** The network domain in the file system */
export interface NetworkDomainObject {
  /**
   * Unique identifier for this domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** The system domain in the file system */
export interface SystemDomainObject {
  /**
   * Unique identifier for this domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** The user domain in the file system */
export interface UserDomainObject {
  /**
   * The user's Desktop folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly desktopFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Documents folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly documentsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Downloads folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly downloadsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Favorites folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly favoritesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Home folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly homeFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Movies folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly moviesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Music folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly musicFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Pictures folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly picturesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Public folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly publicFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The user's Sites folder.
   * Nullable: The Sites folder exists only once the user creates one. The app reported no value in
   * 1 of 1 reads (System Events 1.3.6, macOS 27.2, 2026-11-04).
   */
  readonly sitesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Temporary Items folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly temporaryItemsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * Which UserDomainObject this is: the kind naming the application property that holds it.
   * Never null: the primary identifier.
   */
  readonly kind: UserDomainObjectKind
  /**
   * The Application Support folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationSupportFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Applications folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly applicationsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Desktop Pictures folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly desktopPicturesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Folder Action Scripts folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly folderActionScriptsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Fonts folder.
   * Nullable. The app reported no value in 2 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly fontsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the unique identifier of the domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * The Library folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-05).
   */
  readonly libraryFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * the name of the domain.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The Preferences folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly preferencesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Scripting Additions folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly scriptingAdditionsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Scripts folder.
   * Nullable. The app reported no value in 2 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly scriptsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Shared Documents folder.
   * Nullable. The app reported no value in 1 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly sharedDocumentsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Speakable Items folder.
   * Nullable. The app reported no value in 4 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly speakableItemsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Utilities folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly utilitiesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
  /**
   * The Automator Workflows folder.
   * Nullable. The app reported no value in 3 of 5 reads (System Events 1.3.6, macOS 27.2,
   * 2026-11-04).
   */
  readonly workflowsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null
}

/** An action that can be performed on the UI element */
export interface Action {
  /**
   * what the action does.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * the name of the action.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** An named data value associated with the UI element */
export interface Attribute {
  /**
   * the name of the attribute.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * Can the attribute be set?
   * Nullable. No evidence that the app always sets it.
   */
  readonly settable: boolean | null
  /**
   * the current value of the attribute.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** A browser belonging to a window */
export interface Browser {
  /**
   * Unique identifier for this browser.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A busy indicator belonging to a window */
export interface BusyIndicator {
  /**
   * Unique identifier for this busy indicator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A button belonging to a window or scroll bar */
export interface Button {
  /**
   * Unique identifier for this button.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A checkbox belonging to a window */
export interface Checkbox {
  /**
   * Unique identifier for this checkbox.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A color well belonging to a window */
export interface ColorWell {
  /**
   * Unique identifier for this color well.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A column belonging to a table */
export interface Column {
  /**
   * Unique identifier for this column.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A combo box belonging to a window */
export interface ComboBox {
  /**
   * Unique identifier for this combo box.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A drawer that may be extended from a window */
export interface Drawer {
  /**
   * Unique identifier for this drawer.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A group belonging to a window */
export interface Group {
  /**
   * Unique identifier for this group.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A grow area belonging to a window */
export interface GrowArea {
  /**
   * Unique identifier for this grow area.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** An image belonging to a static text field */
export interface Image {
  /**
   * Unique identifier for this image.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A incrementor belonging to a window */
export interface Incrementor {
  /**
   * Unique identifier for this incrementor.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A list belonging to a window */
export interface List {
  /**
   * Unique identifier for this list.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A menu belonging to a menu bar item */
export interface Menu {
  /**
   * Unique identifier for this menu.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A menu bar belonging to a process */
export interface MenuBar {
  /**
   * Unique identifier for this menu bar.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A menu bar item belonging to a menu bar */
export interface MenuBarItem {
  /**
   * Unique identifier for this menu bar item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A menu button belonging to a window */
export interface MenuButton {
  /**
   * Unique identifier for this menu button.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A menu item belonging to a menu */
export interface MenuItem {
  /**
   * Unique identifier for this menu item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A outline belonging to a window */
export interface Outline {
  /**
   * Unique identifier for this outline.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A pop over belonging to a window */
export interface PopOver {
  /**
   * Unique identifier for this pop over.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A pop up button belonging to a window */
export interface PopUpButton {
  /**
   * Unique identifier for this pop up button.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A process running on this computer */
export interface Process {
  /**
   * Is the process high-level event aware (accepts open application, open document, print document,
   * and quit)?
   * Nullable. No evidence that the app always sets it.
   */
  readonly acceptsHighLevelEvents: boolean | null
  /**
   * Does the process accept remote events?
   * Nullable. No evidence that the app always sets it.
   */
  readonly acceptsRemoteEvents: boolean | null
  /**
   * the architecture in which the process is running.
   * Nullable. No evidence that the app always sets it.
   */
  readonly architecture: string | null
  /**
   * Does the process run exclusively in the background?
   * Nullable. No evidence that the app always sets it.
   */
  readonly backgroundOnly: boolean | null
  /**
   * the bundle identifier of the process' application file.
   * Nullable. No evidence that the app always sets it.
   */
  readonly bundleIdentifier: string | null
  /**
   * Is the process running in the Classic environment?
   * Nullable. No evidence that the app always sets it.
   */
  readonly classic: boolean | null
  /**
   * the OSType of the creator of the process (the signature).
   * Nullable. No evidence that the app always sets it.
   */
  readonly creatorType: string | null
  /**
   * the name of the file from which the process was launched, as displayed in the User Interface.
   * Nullable. No evidence that the app always sets it.
   */
  readonly displayedName: string | null
  /**
   * the file from which the process was launched.
   * Nullable. No evidence that the app always sets it.
   */
  readonly file: string | null
  /**
   * the OSType of the file type of the process.
   * Nullable. No evidence that the app always sets it.
   */
  readonly fileType: string | null
  /**
   * Is the process the frontmost process.
   * Nullable. No evidence that the app always sets it.
   */
  frontmost: boolean | null
  /**
   * Does the process have a scripting terminology, i.e., can it be scripted?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hasScriptingTerminology: boolean | null
  /**
   * The unique identifier of the process.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * the name of the process.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * the number of bytes currently used in the process' partition.
   * Nullable. No evidence that the app always sets it.
   */
  readonly partitionSpaceUsed: Integer | null
  /**
   * the short name of the file from which the process was launched.
   * Nullable. No evidence that the app always sets it.
   */
  readonly shortName: string | null
  /**
   * the size of the partition with which the process was launched.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalPartitionSize: Integer | null
  /**
   * The Unix process identifier of a process running in the native environment, or -1 for a process
   * running in the Classic environment.
   * Nullable. No evidence that the app always sets it.
   */
  readonly unixId: Integer | null
  /**
   * Is the process' layer visible?
   * Nullable. No evidence that the app always sets it.
   */
  visible: string | null
}

/** A progress indicator belonging to a window */
export interface ProgressIndicator {
  /**
   * Unique identifier for this progress indicator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A radio button belonging to a window */
export interface RadioButton {
  /**
   * Unique identifier for this radio button.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A radio button group belonging to a window */
export interface RadioGroup {
  /**
   * Unique identifier for this radio group.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A relevance indicator belonging to a window */
export interface RelevanceIndicator {
  /**
   * Unique identifier for this relevance indicator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A row belonging to a table */
export interface Row {
  /**
   * Unique identifier for this row.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A scroll area belonging to a window */
export interface ScrollArea {
  /**
   * Unique identifier for this scroll area.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A scroll bar belonging to a window */
export interface ScrollBar {
  /**
   * Unique identifier for this scroll bar.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A sheet displayed over a window */
export interface Sheet {
  /**
   * Unique identifier for this sheet.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A slider belonging to a window */
export interface Slider {
  /**
   * Unique identifier for this slider.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A splitter belonging to a window */
export interface Splitter {
  /**
   * Unique identifier for this splitter.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A splitter group belonging to a window */
export interface SplitterGroup {
  /**
   * Unique identifier for this splitter group.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A static text field belonging to a window */
export interface StaticText {
  /**
   * Unique identifier for this static text.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A tab group belonging to a window */
export interface TabGroup {
  /**
   * Unique identifier for this tab group.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A table belonging to a window */
export interface Table {
  /**
   * Unique identifier for this table.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A text area belonging to a window */
export interface TextArea {
  /**
   * Unique identifier for this text area.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A text field belonging to a window */
export interface TextField {
  /**
   * Unique identifier for this text field.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A toolbar belonging to a window */
export interface Toolbar {
  /**
   * Unique identifier for this toolbar.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A piece of the user interface of a process */
export interface UIElement {
  /**
   * a more complete description of the UI element and its capabilities.
   * Nullable. No evidence that the app always sets it.
   */
  readonly accessibilityDescription: string | null
  /**
   * the class of the UI Element, which identifies it function.
   * Nullable. No evidence that the app always sets it.
   */
  readonly class: string | null
  /**
   * the accessibility description, if available; otherwise, the role description.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the UI element enabled? ( Does it accept clicks? ).
   * Nullable. No evidence that the app always sets it.
   */
  readonly enabled: string | null
  /**
   * a list of every UI element contained in this UI element and its child UI elements, to the
   * limits of the tree.
   * Nullable. No evidence that the app always sets it.
   */
  readonly entireContents: string | null
  /**
   * Is the focus on this UI element?
   * Nullable. No evidence that the app always sets it.
   */
  focused: string | null
  /**
   * an elaborate description of the UI element and its capabilities.
   * Nullable. No evidence that the app always sets it.
   */
  readonly help: string | null
  /**
   * the maximum value that the UI element can take on.
   * Nullable. No evidence that the app always sets it.
   */
  readonly maximumValue: string | null
  /**
   * the minimum value that the UI element can take on.
   * Nullable. No evidence that the app always sets it.
   */
  readonly minimumValue: string | null
  /**
   * the name of the UI Element, which identifies it within its container.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * the orientation of the UI element.
   * Nullable. No evidence that the app always sets it.
   */
  readonly orientation: string | null
  /**
   * the position of the UI element.
   * Nullable. No evidence that the app always sets it.
   */
  position: string | null
  /**
   * an encoded description of the UI element and its capabilities.
   * Nullable. No evidence that the app always sets it.
   */
  readonly role: string | null
  /**
   * a more complete description of the UI element's role.
   * Nullable. No evidence that the app always sets it.
   */
  readonly roleDescription: string | null
  /**
   * Is the UI element selected?
   * Nullable. No evidence that the app always sets it.
   */
  selected: string | null
  /**
   * the size of the UI element.
   * Nullable. No evidence that the app always sets it.
   */
  size: string | null
  /**
   * an encoded description of the UI element and its capabilities.
   * Nullable. No evidence that the app always sets it.
   */
  readonly subrole: string | null
  /**
   * the title of the UI element as it appears on the screen.
   * Nullable. No evidence that the app always sets it.
   */
  readonly title: string | null
  /**
   * the current value of the UI element.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** A value indicator ( thumb or slider ) belonging to a scroll bar */
export interface ValueIndicator {
  /**
   * Unique identifier for this value indicator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** A unit of data in Property List format */
export interface PropertyListItem {
  /**
   * the kind of data stored in the property list item: boolean/data/date/list/number/record/string.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the name of the property list item ( if any ).
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * the text representation of the property list data.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
  /**
   * the value of the property list item.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** A named value associated with a unit of data in XML format */
export interface XMLAttribute {
  /**
   * the name of the XML attribute.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * the value of the XML attribute.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** Data in XML format */
export interface XMLData {
  /**
   * the unique identifier of the XML data.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the name of the XML data.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * the text representation of the XML data.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
}

/** A unit of data in XML format */
export interface XMLElement {
  /**
   * the unique identifier of the XML element.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * the name of the XML element.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * the value of the XML element.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** A class within a suite within a scripting definition */
export interface ScriptingClass {
  /**
   * The name of the class.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the class.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The description of the class.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the class hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
  /**
   * The plural name of the class.
   * Nullable. No evidence that the app always sets it.
   */
  readonly pluralName: string | null
  /**
   * The name of the suite to which this class belongs.
   * Nullable. No evidence that the app always sets it.
   */
  readonly suiteName: string | null
}

/** A command within a suite within a scripting definition */
export interface ScriptingCommand {
  /**
   * The name of the command.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the command.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The description of the command.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the command hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
  /**
   * The object or data returned by this command.
   * Nullable. No evidence that the app always sets it.
   */
  readonly scriptingResult: unknown
  /**
   * The name of the suite to which this command belongs.
   * Nullable. No evidence that the app always sets it.
   */
  readonly suiteName: string | null
}

/** The scripting definition of the System Events applicaation */
export interface ScriptingDefinitionObject {
  /**
   * Unique identifier for this scripting definition object.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** An element within a class within a suite within a scripting definition */
export interface ScriptingElement {
  /**
   * Unique identifier for this scripting element.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
}

/** An enumeration within a suite within a scripting definition */
export interface ScriptingEnumeration {
  /**
   * The name of the enumeration.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the enumeration.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Is the enumeration hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
}

/** An enumerator within an enumeration within a suite within a scripting definition */
export interface ScriptingEnumerator {
  /**
   * The name of the enumerator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the enumerator.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The description of the enumerator.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the enumerator hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
}

/** A parameter within a command within a suite within a scripting definition */
export interface ScriptingParameter {
  /**
   * The name of the parameter.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the parameter.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The description of the parameter.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the parameter hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
  /**
   * The kind of object or data specified by this parameter.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * Is the parameter optional?
   * Nullable. No evidence that the app always sets it.
   */
  readonly optional: boolean | null
}

/** A property within a class within a suite within a scripting definition */
export interface ScriptingProperty {
  /**
   * The name of the property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the property.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The type of access to this property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly access: string | null
  /**
   * The description of the property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the property's value an enumerator?
   * Nullable. No evidence that the app always sets it.
   */
  readonly enumerated: boolean | null
  /**
   * Is the property hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
  /**
   * The kind of object or data returned by this property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * Is the property's value a list?
   * Nullable. No evidence that the app always sets it.
   */
  readonly listed: boolean | null
}

/** A suite within a scripting definition */
export interface ScriptingSuite {
  /**
   * The name of the suite.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the suite.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The description of the suite.
   * Nullable. No evidence that the app always sets it.
   */
  readonly description: string | null
  /**
   * Is the suite hidden?
   * Nullable. No evidence that the app always sets it.
   */
  readonly hidden: boolean | null
}

/** Input for creating a Configuration. */
export interface ConfigurationCreateInput {
  /** the name used to authenticate */
  accountName?: string
}

/** Input for updating a Configuration. Omitted fields are left unchanged. */
export interface ConfigurationUpdateInput {
  /**
   * the name used to authenticate.
   * Cannot be reset: null is rejected.
   */
  accountName?: string
}

/** Input for creating an Interface. */
export interface InterfaceCreateInput {
  /** configure the interface speed, duplex, and mtu automatically? */
  automatic?: boolean
  /** the duplex setting  half | full | full with flow control */
  duplex?: string
  /** the packet size */
  mtu?: Integer
  /** ethernet speed 10 | 100 | 1000 */
  speed?: Integer
}

/** Input for updating an Interface. Omitted fields are left unchanged. */
export interface InterfaceUpdateInput {
  /**
   * configure the interface speed, duplex, and mtu automatically?
   * Cannot be reset: null is rejected.
   */
  automatic?: boolean
  /**
   * the duplex setting  half | full | full with flow control.
   * Cannot be reset: null is rejected.
   */
  duplex?: string
  /**
   * the packet size.
   * Cannot be reset: null is rejected.
   */
  mtu?: Integer
  /**
   * ethernet speed 10 | 100 | 1000.
   * Cannot be reset: null is rejected.
   */
  speed?: Integer
}

/** Input for creating a Location. */
export interface LocationCreateInput {
  /** the name of the location */
  name?: string
}

/** Input for updating a Location. Omitted fields are left unchanged. */
export interface LocationUpdateInput {
  /**
   * the name of the location.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating a NetworkPreferencesObject. */
export type NetworkPreferencesObjectCreateInput = Record<string, never>

/** Input for updating a NetworkPreferencesObject. Omitted fields are left unchanged. */
export type NetworkPreferencesObjectUpdateInput = Record<string, never>

/** Input for creating a Service. */
export interface ServiceCreateInput {
  /** the name of the service */
  name?: string
}

/** Input for updating a Service. Omitted fields are left unchanged. */
export interface ServiceUpdateInput {
  /**
   * the name of the service.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating an Alias. */
export interface AliasCreateInput {
  /** the OSType identifying the application that created the alias */
  creatorType?: string
  /** the application that will launch if the alias is opened */
  defaultApplication?: string
  /** the OSType identifying the type of data contained in the alias */
  fileType?: string
  /** Is the alias a stationery pad? */
  stationery?: boolean
}

/** Input for updating an Alias. Omitted fields are left unchanged. */
export interface AliasUpdateInput {
  /**
   * the OSType identifying the application that created the alias.
   * Cannot be reset: null is rejected.
   */
  creatorType?: string
  /**
   * the application that will launch if the alias is opened.
   * Cannot be reset: null is rejected.
   */
  defaultApplication?: string
  /**
   * the OSType identifying the type of data contained in the alias.
   * Cannot be reset: null is rejected.
   */
  fileType?: string
  /**
   * Is the alias a stationery pad?
   * Cannot be reset: null is rejected.
   */
  stationery?: boolean
}

/** Input for creating a ClassicDomainObject. */
export type ClassicDomainObjectCreateInput = Record<string, never>

/** Input for updating a ClassicDomainObject. Omitted fields are left unchanged. */
export type ClassicDomainObjectUpdateInput = Record<string, never>

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

/** Input for creating a DiskItem. */
export interface DiskItemCreateInput {
  /** the date on which the disk item was last modified */
  modificationDate?: Date
  /** the name of the disk item */
  name?: string
  /** Is the disk item visible? */
  visible?: boolean
}

/** Input for updating a DiskItem. Omitted fields are left unchanged. */
export interface DiskItemUpdateInput {
  /**
   * the date on which the disk item was last modified.
   * Cannot be reset: null is rejected.
   */
  modificationDate?: Date
  /**
   * the name of the disk item.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Is the disk item visible?
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
}

/** Input for creating a Domain. */
export type DomainCreateInput = Record<string, never>

/** Input for updating a Domain. Omitted fields are left unchanged. */
export type DomainUpdateInput = Record<string, never>

/** Input for creating a File. */
export interface FileCreateInput {
  /** the OSType identifying the application that created the file */
  creatorType?: string
  /** the application that will launch if the file is opened */
  defaultApplication?: string
  /** the OSType identifying the type of data contained in the file */
  fileType?: string
  /** Is the file a stationery pad? */
  stationery?: boolean
}

/** Input for updating a File. Omitted fields are left unchanged. */
export interface FileUpdateInput {
  /**
   * the OSType identifying the application that created the file.
   * Cannot be reset: null is rejected.
   */
  creatorType?: string
  /**
   * the application that will launch if the file is opened.
   * Cannot be reset: null is rejected.
   */
  defaultApplication?: string
  /**
   * the OSType identifying the type of data contained in the file.
   * Cannot be reset: null is rejected.
   */
  fileType?: string
  /**
   * Is the file a stationery pad?
   * Cannot be reset: null is rejected.
   */
  stationery?: boolean
}

/** Input for creating a FilePackage. */
export type FilePackageCreateInput = Record<string, never>

/** Input for updating a FilePackage. Omitted fields are left unchanged. */
export type FilePackageUpdateInput = Record<string, never>

/** Input for creating a Folder. */
export interface FolderCreateInput {
  /** the date on which the disk item was last modified */
  modificationDate?: Date
  /** the name of the disk item */
  name?: string
  /** Is the disk item visible? */
  visible?: boolean
}

/** Input for updating a Folder. Omitted fields are left unchanged. */
export interface FolderUpdateInput {
  /**
   * the date on which the disk item was last modified.
   * Cannot be reset: null is rejected.
   */
  modificationDate?: Date
  /**
   * the name of the disk item.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Is the disk item visible?
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
}

/** Input for creating a LocalDomainObject. */
export type LocalDomainObjectCreateInput = Record<string, never>

/** Input for updating a LocalDomainObject. Omitted fields are left unchanged. */
export type LocalDomainObjectUpdateInput = Record<string, never>

/** Input for creating a NetworkDomainObject. */
export type NetworkDomainObjectCreateInput = Record<string, never>

/** Input for updating a NetworkDomainObject. Omitted fields are left unchanged. */
export type NetworkDomainObjectUpdateInput = Record<string, never>

/** Input for creating a SystemDomainObject. */
export type SystemDomainObjectCreateInput = Record<string, never>

/** Input for updating a SystemDomainObject. Omitted fields are left unchanged. */
export type SystemDomainObjectUpdateInput = Record<string, never>

/** Input for creating an UserDomainObject. */
export type UserDomainObjectCreateInput = Record<string, never>

/** Input for updating an UserDomainObject. Omitted fields are left unchanged. */
export type UserDomainObjectUpdateInput = Record<string, never>

/** Input for creating an Action. */
export type ActionCreateInput = Record<string, never>

/** Input for updating an Action. Omitted fields are left unchanged. */
export type ActionUpdateInput = Record<string, never>

/** Input for creating an Attribute. */
export interface AttributeCreateInput {
  /** the current value of the attribute */
  value?: string
}

/** Input for updating an Attribute. Omitted fields are left unchanged. */
export interface AttributeUpdateInput {
  /**
   * the current value of the attribute.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a Browser. */
export type BrowserCreateInput = Record<string, never>

/** Input for updating a Browser. Omitted fields are left unchanged. */
export type BrowserUpdateInput = Record<string, never>

/** Input for creating a BusyIndicator. */
export type BusyIndicatorCreateInput = Record<string, never>

/** Input for updating a BusyIndicator. Omitted fields are left unchanged. */
export type BusyIndicatorUpdateInput = Record<string, never>

/** Input for creating a Button. */
export type ButtonCreateInput = Record<string, never>

/** Input for updating a Button. Omitted fields are left unchanged. */
export type ButtonUpdateInput = Record<string, never>

/** Input for creating a Checkbox. */
export type CheckboxCreateInput = Record<string, never>

/** Input for updating a Checkbox. Omitted fields are left unchanged. */
export type CheckboxUpdateInput = Record<string, never>

/** Input for creating a ColorWell. */
export type ColorWellCreateInput = Record<string, never>

/** Input for updating a ColorWell. Omitted fields are left unchanged. */
export type ColorWellUpdateInput = Record<string, never>

/** Input for creating a Column. */
export type ColumnCreateInput = Record<string, never>

/** Input for updating a Column. Omitted fields are left unchanged. */
export type ColumnUpdateInput = Record<string, never>

/** Input for creating a ComboBox. */
export type ComboBoxCreateInput = Record<string, never>

/** Input for updating a ComboBox. Omitted fields are left unchanged. */
export type ComboBoxUpdateInput = Record<string, never>

/** Input for creating a Drawer. */
export type DrawerCreateInput = Record<string, never>

/** Input for updating a Drawer. Omitted fields are left unchanged. */
export type DrawerUpdateInput = Record<string, never>

/** Input for creating a Group. */
export type GroupCreateInput = Record<string, never>

/** Input for updating a Group. Omitted fields are left unchanged. */
export type GroupUpdateInput = Record<string, never>

/** Input for creating a GrowArea. */
export type GrowAreaCreateInput = Record<string, never>

/** Input for updating a GrowArea. Omitted fields are left unchanged. */
export type GrowAreaUpdateInput = Record<string, never>

/** Input for creating an Image. */
export type ImageCreateInput = Record<string, never>

/** Input for updating an Image. Omitted fields are left unchanged. */
export type ImageUpdateInput = Record<string, never>

/** Input for creating an Incrementor. */
export type IncrementorCreateInput = Record<string, never>

/** Input for updating an Incrementor. Omitted fields are left unchanged. */
export type IncrementorUpdateInput = Record<string, never>

/** Input for creating a List. */
export type ListCreateInput = Record<string, never>

/** Input for updating a List. Omitted fields are left unchanged. */
export type ListUpdateInput = Record<string, never>

/** Input for creating a Menu. */
export type MenuCreateInput = Record<string, never>

/** Input for updating a Menu. Omitted fields are left unchanged. */
export type MenuUpdateInput = Record<string, never>

/** Input for creating a MenuBar. */
export type MenuBarCreateInput = Record<string, never>

/** Input for updating a MenuBar. Omitted fields are left unchanged. */
export type MenuBarUpdateInput = Record<string, never>

/** Input for creating a MenuBarItem. */
export type MenuBarItemCreateInput = Record<string, never>

/** Input for updating a MenuBarItem. Omitted fields are left unchanged. */
export type MenuBarItemUpdateInput = Record<string, never>

/** Input for creating a MenuButton. */
export type MenuButtonCreateInput = Record<string, never>

/** Input for updating a MenuButton. Omitted fields are left unchanged. */
export type MenuButtonUpdateInput = Record<string, never>

/** Input for creating a MenuItem. */
export type MenuItemCreateInput = Record<string, never>

/** Input for updating a MenuItem. Omitted fields are left unchanged. */
export type MenuItemUpdateInput = Record<string, never>

/** Input for creating an Outline. */
export type OutlineCreateInput = Record<string, never>

/** Input for updating an Outline. Omitted fields are left unchanged. */
export type OutlineUpdateInput = Record<string, never>

/** Input for creating a PopOver. */
export type PopOverCreateInput = Record<string, never>

/** Input for updating a PopOver. Omitted fields are left unchanged. */
export type PopOverUpdateInput = Record<string, never>

/** Input for creating a PopUpButton. */
export type PopUpButtonCreateInput = Record<string, never>

/** Input for updating a PopUpButton. Omitted fields are left unchanged. */
export type PopUpButtonUpdateInput = Record<string, never>

/** Input for creating a Process. */
export interface ProcessCreateInput {
  /** Is the process the frontmost process */
  frontmost?: boolean
  /** Is the process' layer visible? */
  visible?: string
}

/** Input for updating a Process. Omitted fields are left unchanged. */
export interface ProcessUpdateInput {
  /**
   * Is the process the frontmost process.
   * Cannot be reset: null is rejected.
   */
  frontmost?: boolean
  /**
   * Is the process' layer visible?
   * Cannot be reset: null is rejected.
   */
  visible?: string
}

/** Input for creating a ProgressIndicator. */
export type ProgressIndicatorCreateInput = Record<string, never>

/** Input for updating a ProgressIndicator. Omitted fields are left unchanged. */
export type ProgressIndicatorUpdateInput = Record<string, never>

/** Input for creating a RadioButton. */
export type RadioButtonCreateInput = Record<string, never>

/** Input for updating a RadioButton. Omitted fields are left unchanged. */
export type RadioButtonUpdateInput = Record<string, never>

/** Input for creating a RadioGroup. */
export type RadioGroupCreateInput = Record<string, never>

/** Input for updating a RadioGroup. Omitted fields are left unchanged. */
export type RadioGroupUpdateInput = Record<string, never>

/** Input for creating a RelevanceIndicator. */
export type RelevanceIndicatorCreateInput = Record<string, never>

/** Input for updating a RelevanceIndicator. Omitted fields are left unchanged. */
export type RelevanceIndicatorUpdateInput = Record<string, never>

/** Input for creating a Row. */
export type RowCreateInput = Record<string, never>

/** Input for updating a Row. Omitted fields are left unchanged. */
export type RowUpdateInput = Record<string, never>

/** Input for creating a ScrollArea. */
export type ScrollAreaCreateInput = Record<string, never>

/** Input for updating a ScrollArea. Omitted fields are left unchanged. */
export type ScrollAreaUpdateInput = Record<string, never>

/** Input for creating a ScrollBar. */
export type ScrollBarCreateInput = Record<string, never>

/** Input for updating a ScrollBar. Omitted fields are left unchanged. */
export type ScrollBarUpdateInput = Record<string, never>

/** Input for creating a Sheet. */
export type SheetCreateInput = Record<string, never>

/** Input for updating a Sheet. Omitted fields are left unchanged. */
export type SheetUpdateInput = Record<string, never>

/** Input for creating a Slider. */
export type SliderCreateInput = Record<string, never>

/** Input for updating a Slider. Omitted fields are left unchanged. */
export type SliderUpdateInput = Record<string, never>

/** Input for creating a Splitter. */
export type SplitterCreateInput = Record<string, never>

/** Input for updating a Splitter. Omitted fields are left unchanged. */
export type SplitterUpdateInput = Record<string, never>

/** Input for creating a SplitterGroup. */
export type SplitterGroupCreateInput = Record<string, never>

/** Input for updating a SplitterGroup. Omitted fields are left unchanged. */
export type SplitterGroupUpdateInput = Record<string, never>

/** Input for creating a StaticText. */
export type StaticTextCreateInput = Record<string, never>

/** Input for updating a StaticText. Omitted fields are left unchanged. */
export type StaticTextUpdateInput = Record<string, never>

/** Input for creating a TabGroup. */
export type TabGroupCreateInput = Record<string, never>

/** Input for updating a TabGroup. Omitted fields are left unchanged. */
export type TabGroupUpdateInput = Record<string, never>

/** Input for creating a Table. */
export type TableCreateInput = Record<string, never>

/** Input for updating a Table. Omitted fields are left unchanged. */
export type TableUpdateInput = Record<string, never>

/** Input for creating a TextArea. */
export type TextAreaCreateInput = Record<string, never>

/** Input for updating a TextArea. Omitted fields are left unchanged. */
export type TextAreaUpdateInput = Record<string, never>

/** Input for creating a TextField. */
export type TextFieldCreateInput = Record<string, never>

/** Input for updating a TextField. Omitted fields are left unchanged. */
export type TextFieldUpdateInput = Record<string, never>

/** Input for creating a Toolbar. */
export type ToolbarCreateInput = Record<string, never>

/** Input for updating a Toolbar. Omitted fields are left unchanged. */
export type ToolbarUpdateInput = Record<string, never>

/** Input for creating an UIElement. */
export interface UIElementCreateInput {
  /** Is the focus on this UI element? */
  focused?: string
  /** the position of the UI element */
  position?: string
  /** Is the UI element selected? */
  selected?: string
  /** the size of the UI element */
  size?: string
  /** the current value of the UI element */
  value?: string
}

/** Input for updating an UIElement. Omitted fields are left unchanged. */
export interface UIElementUpdateInput {
  /**
   * Is the focus on this UI element?
   * Cannot be reset: null is rejected.
   */
  focused?: string
  /**
   * the position of the UI element.
   * Cannot be reset: null is rejected.
   */
  position?: string
  /**
   * Is the UI element selected?
   * Cannot be reset: null is rejected.
   */
  selected?: string
  /**
   * the size of the UI element.
   * Cannot be reset: null is rejected.
   */
  size?: string
  /**
   * the current value of the UI element.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a ValueIndicator. */
export type ValueIndicatorCreateInput = Record<string, never>

/** Input for updating a ValueIndicator. Omitted fields are left unchanged. */
export type ValueIndicatorUpdateInput = Record<string, never>

/** Input for creating a PropertyListItem. */
export interface PropertyListItemCreateInput {
  /** the text representation of the property list data */
  text?: string
  /** the value of the property list item */
  value?: string
}

/** Input for updating a PropertyListItem. Omitted fields are left unchanged. */
export interface PropertyListItemUpdateInput {
  /**
   * the text representation of the property list data.
   * Cannot be reset: null is rejected.
   */
  text?: string
  /**
   * the value of the property list item.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a XMLAttribute. */
export interface XMLAttributeCreateInput {
  /** the value of the XML attribute */
  value?: string
}

/** Input for updating a XMLAttribute. Omitted fields are left unchanged. */
export interface XMLAttributeUpdateInput {
  /**
   * the value of the XML attribute.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a XMLData. */
export interface XMLDataCreateInput {
  /** the name of the XML data */
  name?: string
  /** the text representation of the XML data */
  text?: string
}

/** Input for updating a XMLData. Omitted fields are left unchanged. */
export interface XMLDataUpdateInput {
  /**
   * the name of the XML data.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * the text representation of the XML data.
   * Cannot be reset: null is rejected.
   */
  text?: string
}

/** Input for creating a XMLElement. */
export interface XMLElementCreateInput {
  /** the value of the XML element */
  value?: string
}

/** Input for updating a XMLElement. Omitted fields are left unchanged. */
export interface XMLElementUpdateInput {
  /**
   * the value of the XML element.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a ScriptingClass. */
export type ScriptingClassCreateInput = Record<string, never>

/** Input for updating a ScriptingClass. Omitted fields are left unchanged. */
export type ScriptingClassUpdateInput = Record<string, never>

/** Input for creating a ScriptingCommand. */
export type ScriptingCommandCreateInput = Record<string, never>

/** Input for updating a ScriptingCommand. Omitted fields are left unchanged. */
export type ScriptingCommandUpdateInput = Record<string, never>

/** Input for creating a ScriptingDefinitionObject. */
export type ScriptingDefinitionObjectCreateInput = Record<string, never>

/** Input for updating a ScriptingDefinitionObject. Omitted fields are left unchanged. */
export type ScriptingDefinitionObjectUpdateInput = Record<string, never>

/** Input for creating a ScriptingElement. */
export type ScriptingElementCreateInput = Record<string, never>

/** Input for updating a ScriptingElement. Omitted fields are left unchanged. */
export type ScriptingElementUpdateInput = Record<string, never>

/** Input for creating a ScriptingEnumeration. */
export type ScriptingEnumerationCreateInput = Record<string, never>

/** Input for updating a ScriptingEnumeration. Omitted fields are left unchanged. */
export type ScriptingEnumerationUpdateInput = Record<string, never>

/** Input for creating a ScriptingEnumerator. */
export type ScriptingEnumeratorCreateInput = Record<string, never>

/** Input for updating a ScriptingEnumerator. Omitted fields are left unchanged. */
export type ScriptingEnumeratorUpdateInput = Record<string, never>

/** Input for creating a ScriptingParameter. */
export type ScriptingParameterCreateInput = Record<string, never>

/** Input for updating a ScriptingParameter. Omitted fields are left unchanged. */
export type ScriptingParameterUpdateInput = Record<string, never>

/** Input for creating a ScriptingProperty. */
export type ScriptingPropertyCreateInput = Record<string, never>

/** Input for updating a ScriptingProperty. Omitted fields are left unchanged. */
export type ScriptingPropertyUpdateInput = Record<string, never>

/** Input for creating a ScriptingSuite. */
export type ScriptingSuiteCreateInput = Record<string, never>

/** Input for updating a ScriptingSuite. Omitted fields are left unchanged. */
export type ScriptingSuiteUpdateInput = Record<string, never>

/** The Classic domain in the file system */
export interface ClassicDomainObjectResourceClient {
  /** List classic domain objects, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<ClassicDomainObject>>
  /**
   * Read the classic domain object identified by `kind`.
   *
   * @param kind - Which Classic domain. Does not accept null.
   */
  get(kind: ClassicDomainObjectKind, options?: CallOptions): Promise<ClassicDomainObject>
}

/** An item stored in the file system */
export interface DiskItemResourceClient {
  /**
   * Read the disk item identified by `posixPath`.
   *
   * @param posixPath - The POSIX path of the disk item. It names a location, so it finds whatever
   * is at that path now. Does not accept null.
   */
  get(posixPath: string, options?: CallOptions): Promise<DiskItem>
}

/** A domain in the file system */
export interface DomainResourceClient {
  /** List domains, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Domain>>
  /**
   * Read the domain identified by `id`.
   *
   * @param id - The id of the domain. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Domain>
}

/** A folder in the file system */
export interface FolderResourceClient {
  /**
   * Read the folder identified by `posixPath`.
   *
   * @param posixPath - The POSIX path of the folder. It names a location, so it finds whatever
   * folder is at that path now. Does not accept null.
   */
  get(posixPath: string, options?: CallOptions): Promise<Folder>
}

/** The user domain in the file system */
export interface UserDomainObjectResourceClient {
  /** List user domain objects, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<UserDomainObject>>
  /**
   * Read the user domain object identified by `kind`.
   *
   * @param kind - Which user domain. Does not accept null.
   */
  get(kind: UserDomainObjectKind, options?: CallOptions): Promise<UserDomainObject>
}

/** An action that can be performed on the UI element */
export interface ActionResourceClient {
  /** cause the target process to behave as if the action were applied to its UI element */
  perform(options?: CallOptions): Promise<void>
}

/** A piece of the user interface of a process */
export interface UIElementResourceClient {
  /**
   * cause the target process to behave as if the UI element were clicked
   *
   * @param at - when sent to a "process" object, the { x, y } location at which to click, in global
   * coordinates. Does not accept null.
   */
  click(at?: string, options?: CallOptions): Promise<void>
  /** set the selected property of the UI element */
  select(options?: CallOptions): Promise<void>
}

/**
 * The System Events client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link systemEventsContract}. Its type carries the
 * contract's resource table, {@link SystemEventsResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface SystemEventsClient extends ClientBrand<SystemEventsResources> {
  /** The Classic domain in the file system */
  readonly classicDomainObjects: ClassicDomainObjectResourceClient
  /** An item stored in the file system */
  readonly diskItems: DiskItemResourceClient
  /** A domain in the file system */
  readonly domains: DomainResourceClient
  /** A folder in the file system */
  readonly folders: FolderResourceClient
  /** The user domain in the file system */
  readonly userDomainObjects: UserDomainObjectResourceClient
  /** An action that can be performed on the UI element */
  readonly actions: ActionResourceClient
  /** A piece of the user interface of a process */
  readonly uiElements: UIElementResourceClient
  /** Discard the results of a bounded update session with one or more files. */
  abortTransaction(options?: CallOptions): Promise<void>
  /** Begin a bounded update session with one or more files. */
  beginTransaction(options?: CallOptions): Promise<void>
  /** Apply the results of a bounded update session with one or more files. */
  endTransaction(options?: CallOptions): Promise<void>
  /** connect a configuration or service */
  connect(options?: CallOptions): Promise<void>
  /** disconnect a configuration or service */
  disconnect(options?: CallOptions): Promise<void>
  /** start the screen saver */
  start(options?: CallOptions): Promise<void>
  /** stop the screen saver */
  stop(options?: CallOptions): Promise<void>
  /**
   * Move disk item(s) to a new location.
   *
   * @param to - The new location for the disk item(s). Does not accept null.
   */
  move(to: string, options?: CallOptions): Promise<void>
  /** Open disk item(s) with the appropriate application. */
  open(options?: CallOptions): Promise<void>
  /** Log out the current user */
  logOut(options?: CallOptions): Promise<void>
  /**
   * Restart the computer
   *
   * @param stateSavingPreference - Is the user defined state saving preference followed? Does not
   * accept null.
   */
  restart(stateSavingPreference?: boolean, options?: CallOptions): Promise<void>
  /**
   * Shut Down the computer
   *
   * @param stateSavingPreference - Is the user defined state saving preference followed? Does not
   * accept null.
   */
  shutDown(stateSavingPreference?: boolean, options?: CallOptions): Promise<void>
  /** Put the computer to sleep */
  sleep(options?: CallOptions): Promise<void>
  /**
   * cause the target process to behave as if key codes were entered
   *
   * @param using - modifiers with which the key codes are to be entered. Does not accept null.
   */
  keyCode(using?: string, options?: CallOptions): Promise<void>
  /**
   * cause the target process to behave as if keystrokes were entered
   *
   * @param using - modifiers with which the keystrokes are to be entered. Does not accept null.
   */
  keystroke(using?: string, options?: CallOptions): Promise<void>
  /**
   * Attach an action to a folder
   *
   * @param using - a file containing the script to attach. Does not accept null.
   */
  attachActionTo(using: string, options?: CallOptions): Promise<void>
  /** List the actions attached to a folder */
  attachedScripts(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if the UI element were cancelled */
  cancel(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if the UI element were confirmed */
  confirm(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if the UI element were decremented */
  decrement(options?: CallOptions): Promise<void>
  /**
   * Send a folder action code to a folder action script
   *
   * @param folderActionCode - the folder action message to process. Does not accept null.
   * @param withItemList - a list of items for the folder action message to process. Does not accept
   * null.
   * @param withWindowSize - the new window size for the folder action message to process. Does not
   * accept null.
   */
  doFolderAction(
    folderActionCode: string,
    withItemList?: unknown,
    withWindowSize?: Rectangle,
    options?: CallOptions
  ): Promise<void>
  /**
   * Edit an action of a folder
   *
   * @param usingActionName - ...or the name of the action to edit. Does not accept null.
   * @param usingActionNumber - the index number of the action to edit... Does not accept null.
   */
  editActionOf(
    usingActionName?: string,
    usingActionNumber?: Integer,
    options?: CallOptions
  ): Promise<void>
  /** cause the target process to behave as if the UI element were incremented */
  increment(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if keys were held down */
  keyDown(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if keys were released */
  keyUp(options?: CallOptions): Promise<void>
  /** cause the target process to behave as if the UI element were picked */
  pick(options?: CallOptions): Promise<void>
  /**
   * Remove a folder action from a folder
   *
   * @param usingActionName - ...or the name of the action to remove. Does not accept null.
   * @param usingActionNumber - the index number of the action to remove... Does not accept null.
   */
  removeActionFrom(
    usingActionName?: string,
    usingActionNumber?: Integer,
    options?: CallOptions
  ): Promise<void>
}

/** The members of {@link ClassicDomainObjectKind}, for its value type. */
const classicDomainObjectKindMembers = ['classic'] as const

/** The members of {@link UserDomainObjectKind}, for its value type. */
const userDomainObjectKindMembers = ['user'] as const

const classicDomainObjectRecordType: ValueType<ClassicDomainObject> = t.record(
  {
    preferencesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Classic Preferences folder' }
    ),
    kind: t.enumeration(classicDomainObjectKindMembers, {
      description:
        'Which ClassicDomainObject this is: the kind naming the application property that holds it',
    }),
    applicationSupportFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Application Support folder' }
    ),
    applicationsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Applications folder' }
    ),
    id: t.nullable(t.string(), { description: 'the unique identifier of the domain' }),
    libraryFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Library folder' }
    ),
    name: t.nullable(t.string(), { description: 'the name of the domain' }),
    scriptsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Scripts folder' }
    ),
    workflowsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Automator Workflows folder' }
    ),
  },
  { description: 'The Classic domain in the file system' }
)

const diskItemRecordType: ValueType<DiskItem> = t.record(
  {
    busyStatus: t.nullable(t.boolean(), { description: 'Is the disk item busy?' }),
    container: t.nullable(
      t.reference<DiskItem, string, 'DiskItem'>(() => systemEventsContract, 'DiskItem', 'one'),
      { description: 'the folder or disk which has this disk item as an element' }
    ),
    creationDate: t.nullable(t.date(), {
      description: 'the date on which the disk item was created',
    }),
    displayedName: t.nullable(t.string(), {
      description: 'the name of the disk item as displayed in the User Interface',
    }),
    id: t.nullable(t.string(), { description: 'the unique ID of the disk item' }),
    modificationDate: t.nullable(t.date(), {
      description: 'the date on which the disk item was last modified',
    }),
    name: t.nullable(t.string(), { description: 'the name of the disk item' }),
    nameExtension: t.nullable(t.string(), { description: 'the extension portion of the name' }),
    packageFolder: t.nullable(t.boolean(), { description: 'Is the disk item a package?' }),
    path: t.nullable(t.string(), { description: 'the file system path of the disk item' }),
    physicalSize: t.nullable(t.integer(), {
      description: 'the actual space used by the disk item on disk',
    }),
    posixPath: t.string({ description: 'the POSIX file system path of the disk item' }),
    size: t.nullable(t.integer(), { description: 'the logical size of the disk item' }),
    uRL: t.nullable(t.string(), { description: 'the URL of the disk item' }),
    visible: t.nullable(t.boolean(), { description: 'Is the disk item visible?' }),
    volume: t.nullable(t.string(), { description: 'the volume on which the disk item resides' }),
  },
  { description: 'An item stored in the file system' }
)

const domainRecordType: ValueType<Domain> = t.record(
  {
    applicationSupportFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Application Support folder' }
    ),
    applicationsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Applications folder' }
    ),
    desktopPicturesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Desktop Pictures folder' }
    ),
    folderActionScriptsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Folder Action Scripts folder' }
    ),
    fontsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Fonts folder' }
    ),
    id: t.string({ description: 'the unique identifier of the domain' }),
    libraryFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Library folder' }
    ),
    name: t.nullable(t.string(), { description: 'the name of the domain' }),
    preferencesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Preferences folder' }
    ),
    scriptingAdditionsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Scripting Additions folder' }
    ),
    scriptsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Scripts folder' }
    ),
    sharedDocumentsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Shared Documents folder' }
    ),
    speakableItemsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Speakable Items folder' }
    ),
    utilitiesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Utilities folder' }
    ),
    workflowsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Automator Workflows folder' }
    ),
  },
  { description: 'A domain in the file system' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    busyStatus: t.nullable(t.boolean(), { description: 'Is the disk item busy?' }),
    container: t.nullable(
      t.reference<DiskItem, string, 'DiskItem'>(() => systemEventsContract, 'DiskItem', 'one'),
      { description: 'the folder or disk which has this disk item as an element' }
    ),
    creationDate: t.nullable(t.date(), {
      description: 'the date on which the disk item was created',
    }),
    displayedName: t.nullable(t.string(), {
      description: 'the name of the disk item as displayed in the User Interface',
    }),
    id: t.nullable(t.string(), { description: 'the unique ID of the disk item' }),
    modificationDate: t.nullable(t.date(), {
      description: 'the date on which the disk item was last modified',
    }),
    name: t.nullable(t.string(), { description: 'the name of the disk item' }),
    nameExtension: t.nullable(t.string(), { description: 'the extension portion of the name' }),
    packageFolder: t.nullable(t.boolean(), { description: 'Is the disk item a package?' }),
    path: t.nullable(t.string(), { description: 'the file system path of the disk item' }),
    physicalSize: t.nullable(t.integer(), {
      description: 'the actual space used by the disk item on disk',
    }),
    posixPath: t.string({ description: 'the POSIX file system path of the disk item' }),
    size: t.nullable(t.integer(), { description: 'the logical size of the disk item' }),
    uRL: t.nullable(t.string(), { description: 'the URL of the disk item' }),
    visible: t.nullable(t.boolean(), { description: 'Is the disk item visible?' }),
    volume: t.nullable(t.string(), { description: 'the volume on which the disk item resides' }),
  },
  { description: 'A folder in the file system' }
)

const userDomainObjectRecordType: ValueType<UserDomainObject> = t.record(
  {
    desktopFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Desktop folder" }
    ),
    documentsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Documents folder" }
    ),
    downloadsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Downloads folder" }
    ),
    favoritesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Favorites folder" }
    ),
    homeFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Home folder" }
    ),
    moviesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Movies folder" }
    ),
    musicFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Music folder" }
    ),
    picturesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Pictures folder" }
    ),
    publicFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Public folder" }
    ),
    sitesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: "The user's Sites folder" }
    ),
    temporaryItemsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Temporary Items folder' }
    ),
    kind: t.enumeration(userDomainObjectKindMembers, {
      description:
        'Which UserDomainObject this is: the kind naming the application property that holds it',
    }),
    applicationSupportFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Application Support folder' }
    ),
    applicationsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Applications folder' }
    ),
    desktopPicturesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Desktop Pictures folder' }
    ),
    folderActionScriptsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Folder Action Scripts folder' }
    ),
    fontsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Fonts folder' }
    ),
    id: t.nullable(t.string(), { description: 'the unique identifier of the domain' }),
    libraryFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Library folder' }
    ),
    name: t.nullable(t.string(), { description: 'the name of the domain' }),
    preferencesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Preferences folder' }
    ),
    scriptingAdditionsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Scripting Additions folder' }
    ),
    scriptsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Scripts folder' }
    ),
    sharedDocumentsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Shared Documents folder' }
    ),
    speakableItemsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Speakable Items folder' }
    ),
    utilitiesFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Utilities folder' }
    ),
    workflowsFolder: t.nullable(
      t.reference<Folder, string, 'Folder'>(() => systemEventsContract, 'Folder', 'one'),
      { description: 'The Automator Workflows folder' }
    ),
  },
  { description: 'The user domain in the file system' }
)

/**
 * The type of the resource table of {@link systemEventsContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type SystemEventsResources = Readonly<{
  ClassicDomainObject: ResourceDescriptor<ClassicDomainObject, ClassicDomainObjectKind> & {
    readonly id: ValueType<ClassicDomainObjectKind>
    readonly get: 'system-events.classicDomainObjects.get'
    readonly list: 'system-events.classicDomainObjects.list'
  }
  DiskItem: ResourceDescriptor<DiskItem, string> & {
    readonly id: ValueType<string>
    readonly get: 'system-events.diskItems.get'
  }
  Domain: ResourceDescriptor<Domain, string> & {
    readonly id: ValueType<string>
    readonly get: 'system-events.domains.get'
    readonly list: 'system-events.domains.list'
  }
  Folder: ResourceDescriptor<Folder, string> & {
    readonly id: ValueType<string>
    readonly get: 'system-events.folders.get'
  }
  UserDomainObject: ResourceDescriptor<UserDomainObject, UserDomainObjectKind> & {
    readonly id: ValueType<UserDomainObjectKind>
    readonly get: 'system-events.userDomainObjects.get'
    readonly list: 'system-events.userDomainObjects.list'
  }
}>

/**
 * The resource table: the implementation of {@link SystemEventsResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  ClassicDomainObject: {
    name: 'ClassicDomainObject',
    record: classicDomainObjectRecordType,
    id: t.enumeration(classicDomainObjectKindMembers, {
      description:
        'Which ClassicDomainObject this is: the kind naming the application property that holds it',
    }),
    get: 'system-events.classicDomainObjects.get',
    list: 'system-events.classicDomainObjects.list',
  },
  DiskItem: {
    name: 'DiskItem',
    record: diskItemRecordType,
    id: t.string({ description: 'the POSIX file system path of the disk item' }),
    get: 'system-events.diskItems.get',
  },
  Domain: {
    name: 'Domain',
    record: domainRecordType,
    id: t.string({ description: 'the unique identifier of the domain' }),
    get: 'system-events.domains.get',
    list: 'system-events.domains.list',
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
    id: t.string({ description: 'the POSIX file system path of the disk item' }),
    get: 'system-events.folders.get',
  },
  UserDomainObject: {
    name: 'UserDomainObject',
    record: userDomainObjectRecordType,
    id: t.enumeration(userDomainObjectKindMembers, {
      description:
        'Which UserDomainObject this is: the kind naming the application property that holds it',
    }),
    get: 'system-events.userDomainObjects.get',
    list: 'system-events.userDomainObjects.list',
  },
} satisfies SystemEventsResources

const appAbortTransactionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.abortTransaction',
  permission: 'system-events:app:abortTransaction',
  target: { command: 'abortTransaction' },
  description: 'Discard the results of a bounded update session with one or more files.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appBeginTransactionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.beginTransaction',
  permission: 'system-events:app:beginTransaction',
  target: { command: 'beginTransaction' },
  description: 'Begin a bounded update session with one or more files.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appEndTransactionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.endTransaction',
  permission: 'system-events:app:endTransaction',
  target: { command: 'endTransaction' },
  description: 'Apply the results of a bounded update session with one or more files.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appConnectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.connect',
  permission: 'system-events:app:connect',
  target: { command: 'connect' },
  description: 'connect a configuration or service',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appDisconnectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.disconnect',
  permission: 'system-events:app:disconnect',
  target: { command: 'disconnect' },
  description: 'disconnect a configuration or service',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStartOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.start',
  permission: 'system-events:app:start',
  target: { command: 'start' },
  description: 'start the screen saver',
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
  id: 'system-events.app.stop',
  permission: 'system-events:app:stop',
  target: { command: 'stop' },
  description: 'stop the screen saver',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'system-events.app.move',
  permission: 'system-events:app:move',
  target: { command: 'move' },
  description: 'Move disk item(s) to a new location.',
  input: t.record({
    to: t.string({ description: 'The new location for the disk item(s).' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'The new location for the disk item(s).' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.open',
  permission: 'system-events:app:open',
  target: { command: 'open' },
  description: 'Open disk item(s) with the appropriate application.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appLogOutOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.logOut',
  permission: 'system-events:app:logOut',
  target: { command: 'logOut' },
  description: 'Log out the current user',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRestartOperation: OperationDescriptor<
  { readonly stateSavingPreference?: boolean | undefined },
  undefined
> = {
  id: 'system-events.app.restart',
  permission: 'system-events:app:restart',
  target: { command: 'restart' },
  description: 'Restart the computer',
  input: t.record({
    stateSavingPreference: t.optional(
      t.boolean({ description: 'Is the user defined state saving preference followed?' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      stateSavingPreference: {
        type: 'boolean',
        description: 'Is the user defined state saving preference followed?',
      },
    },
    additionalProperties: false,
  },
}

const appShutDownOperation: OperationDescriptor<
  { readonly stateSavingPreference?: boolean | undefined },
  undefined
> = {
  id: 'system-events.app.shutDown',
  permission: 'system-events:app:shutDown',
  target: { command: 'shutDown' },
  description: 'Shut Down the computer',
  input: t.record({
    stateSavingPreference: t.optional(
      t.boolean({ description: 'Is the user defined state saving preference followed?' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      stateSavingPreference: {
        type: 'boolean',
        description: 'Is the user defined state saving preference followed?',
      },
    },
    additionalProperties: false,
  },
}

const appSleepOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.sleep',
  permission: 'system-events:app:sleep',
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

const uiElementClickOperation: OperationDescriptor<
  { readonly at?: string | undefined },
  undefined
> = {
  id: 'system-events.uiElements.click',
  permission: 'system-events:uiElements:click',
  target: { command: 'click', resource: 'UIElement' },
  description: 'cause the target process to behave as if the UI element were clicked',
  input: t.record({
    at: t.optional(
      t.string({
        description:
          'when sent to a "process" object, the { x, y } location at which to click, in global coordinates',
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      at: {
        type: 'string',
        description:
          'when sent to a "process" object, the { x, y } location at which to click, in global coordinates',
      },
    },
    additionalProperties: false,
  },
}

const appKeyCodeOperation: OperationDescriptor<{ readonly using?: string | undefined }, undefined> =
  {
    id: 'system-events.app.keyCode',
    permission: 'system-events:app:keyCode',
    target: { command: 'keyCode' },
    description: 'cause the target process to behave as if key codes were entered',
    input: t.record({
      using: t.optional(
        t.string({ description: 'modifiers with which the key codes are to be entered' })
      ),
    }),
    output: t.none(),
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        using: {
          type: 'string',
          description: 'modifiers with which the key codes are to be entered',
        },
      },
      additionalProperties: false,
    },
  }

const appKeystrokeOperation: OperationDescriptor<
  { readonly using?: string | undefined },
  undefined
> = {
  id: 'system-events.app.keystroke',
  permission: 'system-events:app:keystroke',
  target: { command: 'keystroke' },
  description: 'cause the target process to behave as if keystrokes were entered',
  input: t.record({
    using: t.optional(
      t.string({ description: 'modifiers with which the keystrokes are to be entered' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      using: {
        type: 'string',
        description: 'modifiers with which the keystrokes are to be entered',
      },
    },
    additionalProperties: false,
  },
}

const actionPerformOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.actions.perform',
  permission: 'system-events:actions:perform',
  target: { command: 'perform', resource: 'Action' },
  description: 'cause the target process to behave as if the action were applied to its UI element',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const uiElementSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.uiElements.select',
  permission: 'system-events:uiElements:select',
  target: { command: 'select', resource: 'UIElement' },
  description: 'set the selected property of the UI element',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appAttachActionToOperation: OperationDescriptor<{ readonly using: string }, undefined> = {
  id: 'system-events.app.attachActionTo',
  permission: 'system-events:app:attachActionTo',
  target: { command: 'attachActionTo' },
  description: 'Attach an action to a folder',
  input: t.record({
    using: t.string({ description: 'a file containing the script to attach' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      using: { type: 'string', description: 'a file containing the script to attach' },
    },
    required: ['using'],
    additionalProperties: false,
  },
}

const appAttachedScriptsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.attachedScripts',
  permission: 'system-events:app:attachedScripts',
  target: { command: 'attachedScripts' },
  description: 'List the actions attached to a folder',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCancelOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.cancel',
  permission: 'system-events:app:cancel',
  target: { command: 'cancel' },
  description: 'cause the target process to behave as if the UI element were cancelled',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appConfirmOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.confirm',
  permission: 'system-events:app:confirm',
  target: { command: 'confirm' },
  description: 'cause the target process to behave as if the UI element were confirmed',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appDecrementOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.decrement',
  permission: 'system-events:app:decrement',
  target: { command: 'decrement' },
  description: 'cause the target process to behave as if the UI element were decremented',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appDoFolderActionOperation: OperationDescriptor<
  {
    readonly folderActionCode: string
    readonly withItemList?: unknown
    readonly withWindowSize?: Rectangle | undefined
  },
  undefined
> = {
  id: 'system-events.app.doFolderAction',
  permission: 'system-events:app:doFolderAction',
  target: { command: 'doFolderAction' },
  description: 'Send a folder action code to a folder action script',
  input: t.record({
    folderActionCode: t.string({ description: 'the folder action message to process' }),
    withItemList: t.optional(
      t.unknown({ description: 'a list of items for the folder action message to process' })
    ),
    withWindowSize: t.optional(
      t.rectangle({ description: 'the new window size for the folder action message to process' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      folderActionCode: { type: 'string', description: 'the folder action message to process' },
      withItemList: {
        allOf: [
          {
            description: 'a list of items for the folder action message to process',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
      withWindowSize: {
        type: 'object',
        properties: {
          x: {
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
          y: {
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
          width: {
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
          height: {
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
        },
        required: ['x', 'y', 'width', 'height'],
        additionalProperties: false,
        description: 'the new window size for the folder action message to process',
      },
    },
    required: ['folderActionCode'],
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

const appEditActionOfOperation: OperationDescriptor<
  {
    readonly usingActionName?: string | undefined
    readonly usingActionNumber?: Integer | undefined
  },
  undefined
> = {
  id: 'system-events.app.editActionOf',
  permission: 'system-events:app:editActionOf',
  target: { command: 'editActionOf' },
  description: 'Edit an action of a folder',
  input: t.record({
    usingActionName: t.optional(t.string({ description: '...or the name of the action to edit' })),
    usingActionNumber: t.optional(
      t.integer({ description: 'the index number of the action to edit...' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      usingActionName: { type: 'string', description: '...or the name of the action to edit' },
      usingActionNumber: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'the index number of the action to edit...',
      },
    },
    additionalProperties: false,
  },
}

const appIncrementOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.increment',
  permission: 'system-events:app:increment',
  target: { command: 'increment' },
  description: 'cause the target process to behave as if the UI element were incremented',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appKeyDownOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.keyDown',
  permission: 'system-events:app:keyDown',
  target: { command: 'keyDown' },
  description: 'cause the target process to behave as if keys were held down',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appKeyUpOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.keyUp',
  permission: 'system-events:app:keyUp',
  target: { command: 'keyUp' },
  description: 'cause the target process to behave as if keys were released',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPickOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'system-events.app.pick',
  permission: 'system-events:app:pick',
  target: { command: 'pick' },
  description: 'cause the target process to behave as if the UI element were picked',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRemoveActionFromOperation: OperationDescriptor<
  {
    readonly usingActionName?: string | undefined
    readonly usingActionNumber?: Integer | undefined
  },
  undefined
> = {
  id: 'system-events.app.removeActionFrom',
  permission: 'system-events:app:removeActionFrom',
  target: { command: 'removeActionFrom' },
  description: 'Remove a folder action from a folder',
  input: t.record({
    usingActionName: t.optional(
      t.string({ description: '...or the name of the action to remove' })
    ),
    usingActionNumber: t.optional(
      t.integer({ description: 'the index number of the action to remove...' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      usingActionName: { type: 'string', description: '...or the name of the action to remove' },
      usingActionNumber: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'the index number of the action to remove...',
      },
    },
    additionalProperties: false,
  },
}

const diskItemGetDiskItemOperation: OperationDescriptor<{ readonly posixPath: string }, DiskItem> =
  {
    id: 'system-events.diskItems.get',
    permission: 'system-events:diskItems:get',
    target: { command: 'getDiskItem', resource: 'DiskItem' },
    description: 'Get the disk item at a POSIX path',
    input: t.record({
      posixPath: t.string({
        description:
          'The POSIX path of the disk item. It names a location, so it finds whatever is at that path now.',
      }),
    }),
    output: diskItemRecordType,
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        posixPath: {
          type: 'string',
          description:
            'The POSIX path of the disk item. It names a location, so it finds whatever is at that path now.',
        },
      },
      required: ['posixPath'],
      additionalProperties: false,
    },
  }

const folderGetFolderOperation: OperationDescriptor<{ readonly posixPath: string }, Folder> = {
  id: 'system-events.folders.get',
  permission: 'system-events:folders:get',
  target: { command: 'getFolder', resource: 'Folder' },
  description: 'Get the folder at a POSIX path',
  input: t.record({
    posixPath: t.string({
      description:
        'The POSIX path of the folder. It names a location, so it finds whatever folder is at that path now.',
    }),
  }),
  output: folderRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      posixPath: {
        type: 'string',
        description:
          'The POSIX path of the folder. It names a location, so it finds whatever folder is at that path now.',
      },
    },
    required: ['posixPath'],
    additionalProperties: false,
  },
}

const domainListDomainsOperation: OperationDescriptor<Record<string, never>, Page<Domain>> = {
  id: 'system-events.domains.list',
  permission: 'system-events:domains:list',
  target: { command: 'listDomains', resource: 'Domain' },
  description: 'List the domains of the file system',
  input: t.record({}),
  output: t.page(domainRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const domainGetDomainOperation: OperationDescriptor<{ readonly id: string }, Domain> = {
  id: 'system-events.domains.get',
  permission: 'system-events:domains:get',
  target: { command: 'getDomain', resource: 'Domain' },
  description: 'Get a domain by its id',
  input: t.record({
    id: t.string({ description: 'The id of the domain' }),
  }),
  output: domainRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'The id of the domain' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const userDomainObjectListUserDomainObjectsOperation: OperationDescriptor<
  Record<string, never>,
  Page<UserDomainObject>
> = {
  id: 'system-events.userDomainObjects.list',
  permission: 'system-events:userDomainObjects:list',
  target: { command: 'listUserDomainObjects', resource: 'UserDomainObject' },
  description: 'List the user domain',
  input: t.record({}),
  output: t.page(userDomainObjectRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const userDomainObjectGetUserDomainObjectOperation: OperationDescriptor<
  { readonly kind: UserDomainObjectKind },
  UserDomainObject
> = {
  id: 'system-events.userDomainObjects.get',
  permission: 'system-events:userDomainObjects:get',
  target: { command: 'getUserDomainObject', resource: 'UserDomainObject' },
  description: 'Get the user domain by its kind',
  input: t.record({
    kind: t.enumeration(userDomainObjectKindMembers, { description: 'Which user domain' }),
  }),
  output: userDomainObjectRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { kind: { type: 'string', enum: ['user'], description: 'Which user domain' } },
    required: ['kind'],
    additionalProperties: false,
  },
}

const classicDomainObjectListClassicDomainObjectsOperation: OperationDescriptor<
  Record<string, never>,
  Page<ClassicDomainObject>
> = {
  id: 'system-events.classicDomainObjects.list',
  permission: 'system-events:classicDomainObjects:list',
  target: { command: 'listClassicDomainObjects', resource: 'ClassicDomainObject' },
  description: 'List the Classic domain',
  input: t.record({}),
  output: t.page(classicDomainObjectRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const classicDomainObjectGetClassicDomainObjectOperation: OperationDescriptor<
  { readonly kind: ClassicDomainObjectKind },
  ClassicDomainObject
> = {
  id: 'system-events.classicDomainObjects.get',
  permission: 'system-events:classicDomainObjects:get',
  target: { command: 'getClassicDomainObject', resource: 'ClassicDomainObject' },
  description: 'Get the Classic domain by its kind',
  input: t.record({
    kind: t.enumeration(classicDomainObjectKindMembers, { description: 'Which Classic domain' }),
  }),
  output: classicDomainObjectRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['classic'], description: 'Which Classic domain' },
    },
    required: ['kind'],
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SystemEventsClient>['operations'] = {
  'system-events.app.abortTransaction': appAbortTransactionOperation,
  'system-events.app.beginTransaction': appBeginTransactionOperation,
  'system-events.app.endTransaction': appEndTransactionOperation,
  'system-events.app.connect': appConnectOperation,
  'system-events.app.disconnect': appDisconnectOperation,
  'system-events.app.start': appStartOperation,
  'system-events.app.stop': appStopOperation,
  'system-events.app.move': appMoveOperation,
  'system-events.app.open': appOpenOperation,
  'system-events.app.logOut': appLogOutOperation,
  'system-events.app.restart': appRestartOperation,
  'system-events.app.shutDown': appShutDownOperation,
  'system-events.app.sleep': appSleepOperation,
  'system-events.uiElements.click': uiElementClickOperation,
  'system-events.app.keyCode': appKeyCodeOperation,
  'system-events.app.keystroke': appKeystrokeOperation,
  'system-events.actions.perform': actionPerformOperation,
  'system-events.uiElements.select': uiElementSelectOperation,
  'system-events.app.attachActionTo': appAttachActionToOperation,
  'system-events.app.attachedScripts': appAttachedScriptsOperation,
  'system-events.app.cancel': appCancelOperation,
  'system-events.app.confirm': appConfirmOperation,
  'system-events.app.decrement': appDecrementOperation,
  'system-events.app.doFolderAction': appDoFolderActionOperation,
  'system-events.app.editActionOf': appEditActionOfOperation,
  'system-events.app.increment': appIncrementOperation,
  'system-events.app.keyDown': appKeyDownOperation,
  'system-events.app.keyUp': appKeyUpOperation,
  'system-events.app.pick': appPickOperation,
  'system-events.app.removeActionFrom': appRemoveActionFromOperation,
  'system-events.diskItems.get': diskItemGetDiskItemOperation,
  'system-events.folders.get': folderGetFolderOperation,
  'system-events.domains.list': domainListDomainsOperation,
  'system-events.domains.get': domainGetDomainOperation,
  'system-events.userDomainObjects.list': userDomainObjectListUserDomainObjectsOperation,
  'system-events.userDomainObjects.get': userDomainObjectGetUserDomainObjectOperation,
  'system-events.classicDomainObjects.list': classicDomainObjectListClassicDomainObjectsOperation,
  'system-events.classicDomainObjects.get': classicDomainObjectGetClassicDomainObjectOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SystemEventsClient {
  return {
    classicDomainObjects: {
      list: (options) =>
        runtime.invoke(classicDomainObjectListClassicDomainObjectsOperation, {}, options),
      get: (kind, options) =>
        runtime.invoke(classicDomainObjectGetClassicDomainObjectOperation, { kind }, options),
    },
    diskItems: {
      get: (posixPath, options) =>
        runtime.invoke(diskItemGetDiskItemOperation, { posixPath }, options),
    },
    domains: {
      list: (options) => runtime.invoke(domainListDomainsOperation, {}, options),
      get: (id, options) => runtime.invoke(domainGetDomainOperation, { id }, options),
    },
    folders: {
      get: (posixPath, options) => runtime.invoke(folderGetFolderOperation, { posixPath }, options),
    },
    userDomainObjects: {
      list: (options) =>
        runtime.invoke(userDomainObjectListUserDomainObjectsOperation, {}, options),
      get: (kind, options) =>
        runtime.invoke(userDomainObjectGetUserDomainObjectOperation, { kind }, options),
    },
    actions: {
      perform: (options) => runtime.invoke(actionPerformOperation, {}, options),
    },
    uiElements: {
      click: (at, options) => runtime.invoke(uiElementClickOperation, { at }, options),
      select: (options) => runtime.invoke(uiElementSelectOperation, {}, options),
    },
    abortTransaction: (options) => runtime.invoke(appAbortTransactionOperation, {}, options),
    beginTransaction: (options) => runtime.invoke(appBeginTransactionOperation, {}, options),
    endTransaction: (options) => runtime.invoke(appEndTransactionOperation, {}, options),
    connect: (options) => runtime.invoke(appConnectOperation, {}, options),
    disconnect: (options) => runtime.invoke(appDisconnectOperation, {}, options),
    start: (options) => runtime.invoke(appStartOperation, {}, options),
    stop: (options) => runtime.invoke(appStopOperation, {}, options),
    move: (to, options) => runtime.invoke(appMoveOperation, { to }, options),
    open: (options) => runtime.invoke(appOpenOperation, {}, options),
    logOut: (options) => runtime.invoke(appLogOutOperation, {}, options),
    restart: (stateSavingPreference, options) =>
      runtime.invoke(appRestartOperation, { stateSavingPreference }, options),
    shutDown: (stateSavingPreference, options) =>
      runtime.invoke(appShutDownOperation, { stateSavingPreference }, options),
    sleep: (options) => runtime.invoke(appSleepOperation, {}, options),
    keyCode: (using, options) => runtime.invoke(appKeyCodeOperation, { using }, options),
    keystroke: (using, options) => runtime.invoke(appKeystrokeOperation, { using }, options),
    attachActionTo: (using, options) =>
      runtime.invoke(appAttachActionToOperation, { using }, options),
    attachedScripts: (options) => runtime.invoke(appAttachedScriptsOperation, {}, options),
    cancel: (options) => runtime.invoke(appCancelOperation, {}, options),
    confirm: (options) => runtime.invoke(appConfirmOperation, {}, options),
    decrement: (options) => runtime.invoke(appDecrementOperation, {}, options),
    doFolderAction: (folderActionCode, withItemList, withWindowSize, options) =>
      runtime.invoke(
        appDoFolderActionOperation,
        { folderActionCode, withItemList, withWindowSize },
        options
      ),
    editActionOf: (usingActionName, usingActionNumber, options) =>
      runtime.invoke(appEditActionOfOperation, { usingActionName, usingActionNumber }, options),
    increment: (options) => runtime.invoke(appIncrementOperation, {}, options),
    keyDown: (options) => runtime.invoke(appKeyDownOperation, {}, options),
    keyUp: (options) => runtime.invoke(appKeyUpOperation, {}, options),
    pick: (options) => runtime.invoke(appPickOperation, {}, options),
    removeActionFrom: (usingActionName, usingActionNumber, options) =>
      runtime.invoke(appRemoveActionFromOperation, { usingActionName, usingActionNumber }, options),
  }
}

/**
 * The System Events contract. Pass it to a client factory to obtain a
 * {@link SystemEventsClient}.
 */
export const systemEventsContract: AppContract<SystemEventsClient, SystemEventsResources> = {
  app: 'system-events',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}

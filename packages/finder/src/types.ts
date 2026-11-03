/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

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
  entireContents: string
}

/** Input for creating a Container */
export type ContainerCreateInput = Record<string, never>

/** Input for updating a Container */
export type ContainerUpdateInput = Partial<ContainerCreateInput>

/** A disk */
export interface Disk {
  /** the unique id for this disk (unchanged while disk remains connected and Finder remains running) */
  id: number
  /** the total number of bytes (free or used) on the disk */
  capacity: number
  /** the number of free bytes left on the disk */
  freeSpace: number
  /** Can the media be ejected (floppies, CDs, and so on)? */
  ejectable: boolean
  /** Is the media a local volume (as opposed to a file server)? */
  localVolume: boolean
  /** Is this disk the boot disk? */
  startup: boolean
  /** the filesystem format of this disk */
  format: string
  /** Does this disk do file system journaling? */
  journalingEnabled: boolean
  /** Ignore permissions on this disk? */
  ignorePrivileges: boolean
}

/** Input for creating a Disk */
export interface DiskCreateInput {
  /** Ignore permissions on this disk? */
  ignorePrivileges?: boolean
}

/** Input for updating a Disk */
export type DiskUpdateInput = Partial<DiskCreateInput>

/** A folder */
export interface Folder {
  /** Unique identifier for this folder */
  id: number
}

/** Input for creating a Folder */
export type FolderCreateInput = Record<string, never>

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>

/** A file */
export interface File {
  /** the OSType identifying the type of data contained in the item */
  fileType: string
  /** the OSType identifying the application that created the item */
  creatorType: string
  /** Is the file a stationery pad? */
  stationery: boolean
  /** the version of the product (visible at the top of the “Get Info” window) */
  productVersion: string
  /** the version of the file (visible at the bottom of the “Get Info” window) */
  version: string
}

/** Input for creating a File */
export interface FileCreateInput {
  /** the OSType identifying the type of data contained in the item */
  fileType?: string
  /** the OSType identifying the application that created the item */
  creatorType?: string
  /** Is the file a stationery pad? */
  stationery?: boolean
}

/** Input for updating a File */
export type FileUpdateInput = Partial<FileCreateInput>

/** An alias file (created with “Make Alias”) */
export interface AliasFile {
  /** the original item pointed to by the alias */
  originalItem: string
}

/** Input for creating a AliasFile */
export interface AliasFileCreateInput {
  /** the original item pointed to by the alias */
  originalItem?: string
}

/** Input for updating a AliasFile */
export type AliasFileUpdateInput = Partial<AliasFileCreateInput>

/** An application's file on disk */
export interface ApplicationFile {
  /** the bundle identifier or creator type of the application */
  id: string
  /** Is the application high-level event aware? (OBSOLETE: always returns true) */
  acceptsHighLevelEvents: boolean
  /** Does the process have a scripting terminology, i.e., can it be scripted? */
  hasScriptingTerminology: boolean
}

/** Input for creating a ApplicationFile */
export type ApplicationFileCreateInput = Record<string, never>

/** Input for updating a ApplicationFile */
export type ApplicationFileUpdateInput = Partial<ApplicationFileCreateInput>

/** A document file */
export type DocumentFile = Record<string, never>

/** Input for creating a DocumentFile */
export type DocumentFileCreateInput = Record<string, never>

/** Input for updating a DocumentFile */
export type DocumentFileUpdateInput = Partial<DocumentFileCreateInput>

/** A file containing an internet location */
export interface InternetLocationFile {
  /** the internet location */
  location: string
}

/** Input for creating a InternetLocationFile */
export type InternetLocationFileCreateInput = Record<string, never>

/** Input for updating a InternetLocationFile */
export type InternetLocationFileUpdateInput = Partial<InternetLocationFileCreateInput>

/** A clipping */
export interface Clipping {
  /** (NOT AVAILABLE YET) the clipping window for this clipping */
  clippingWindow: string
}

/** Input for creating a Clipping */
export type ClippingCreateInput = Record<string, never>

/** Input for updating a Clipping */
export type ClippingUpdateInput = Partial<ClippingCreateInput>

/** A package */
export interface Package {
  /** Unique identifier for this package */
  id: string
}

/** Input for creating a Package */
export type PackageCreateInput = Record<string, never>

/** Input for updating a Package */
export type PackageUpdateInput = Partial<PackageCreateInput>

/** A file viewer window */
export interface FinderWindow {
  /** the container at which this file viewer is targeted */
  target: string
  /** the current view for the container window */
  currentView: string
  /** the icon view options for the container window */
  iconViewOptions: unknown
  /** the list view options for the container window */
  listViewOptions: unknown
  /** the column view options for the container window */
  columnViewOptions: unknown
  /** Is the window's toolbar visible? */
  toolbarVisible: boolean
  /** Is the window's status bar visible? */
  statusbarVisible: boolean
  /** Is the window's path bar visible? */
  pathbarVisible: boolean
  /** the width of the sidebar for the container window */
  sidebarWidth: number
}

/** Input for creating a FinderWindow */
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
  sidebarWidth?: number
}

/** Input for updating a FinderWindow */
export type FinderWindowUpdateInput = Partial<FinderWindowCreateInput>

/** The window containing a clipping */
export interface ClippingWindow {
  /** Unique identifier for this window */
  id: number
}

/** Input for creating a ClippingWindow */
export type ClippingWindowCreateInput = Record<string, never>

/** Input for updating a ClippingWindow */
export type ClippingWindowUpdateInput = Partial<ClippingWindowCreateInput>

/** the list view options */
export interface ListViewOptions {
  /** Are folder sizes calculated and displayed in the window? */
  calculatesFolderSizes: boolean
  /** displays a preview of the item in list view */
  showsIconPreview: boolean
  /** the size of icons displayed in the list view */
  iconSize: string
  /** the size of the text displayed in the list view */
  textSize: number
  /** the column that the list view is sorted on */
  sortColumn: Column
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
  usesRelativeDates: boolean
}

/** Input for creating a ListViewOptions */
export interface ListViewOptionsCreateInput {
  /** Are folder sizes calculated and displayed in the window? */
  calculatesFolderSizes?: boolean
  /** displays a preview of the item in list view */
  showsIconPreview?: boolean
  /** the size of icons displayed in the list view */
  iconSize?: string
  /** the size of the text displayed in the list view */
  textSize?: number
  /** Are relative dates (e.g., today, yesterday) shown in the list view? */
  usesRelativeDates?: boolean
}

/** Input for updating a ListViewOptions */
export type ListViewOptionsUpdateInput = Partial<ListViewOptionsCreateInput>

/** a column of a list view */
export interface Column {
  /** the index in the front-to-back ordering within its container */
  index: number
  /** the column name */
  name: string
  /** The direction in which the window is sorted */
  sortDirection: string
  /** the width of this column */
  width: number
  /** the minimum allowed width of this column */
  minimumWidth: number
  /** the maximum allowed width of this column */
  maximumWidth: number
  /** is this column visible */
  visible: boolean
}

/** Input for creating a Column */
export interface ColumnCreateInput {
  /** the index in the front-to-back ordering within its container */
  index?: number
  /** The direction in which the window is sorted */
  sortDirection?: string
  /** the width of this column */
  width?: number
  /** is this column visible */
  visible?: boolean
}

/** Input for updating a Column */
export type ColumnUpdateInput = Partial<ColumnCreateInput>

// Zod schemas for runtime validation

export const ContainerSchema = z.object({
  entireContents: z.string(),
})

export const DiskSchema = z.object({
  id: z.number(),
  capacity: z.number(),
  freeSpace: z.number(),
  ejectable: z.boolean(),
  localVolume: z.boolean(),
  startup: z.boolean(),
  format: z.string(),
  journalingEnabled: z.boolean(),
  ignorePrivileges: z.boolean(),
})

export const FolderSchema = z.object({
  id: z.number(),
})

export const FileSchema = z.object({
  fileType: z.string(),
  creatorType: z.string(),
  stationery: z.boolean(),
  productVersion: z.string(),
  version: z.string(),
})

export const AliasFileSchema = z.object({
  originalItem: z.string(),
})

export const ApplicationFileSchema = z.object({
  id: z.string(),
  acceptsHighLevelEvents: z.boolean(),
  hasScriptingTerminology: z.boolean(),
})

export const DocumentFileSchema = z.object({})

export const InternetLocationFileSchema = z.object({
  location: z.string(),
})

export const ClippingSchema = z.object({
  clippingWindow: z.string(),
})

export const PackageSchema = z.object({
  id: z.string(),
})

export const FinderWindowSchema = z.object({
  target: z.string(),
  currentView: z.string(),
  iconViewOptions: z.string(),
  listViewOptions: z.string(),
  columnViewOptions: z.string(),
  toolbarVisible: z.boolean(),
  statusbarVisible: z.boolean(),
  pathbarVisible: z.boolean(),
  sidebarWidth: z.number(),
})

export const ClippingWindowSchema = z.object({
  id: z.number(),
})

export const ListViewOptionsSchema = z.object({
  calculatesFolderSizes: z.boolean(),
  showsIconPreview: z.boolean(),
  iconSize: z.string(),
  textSize: z.number(),
  sortColumn: z.string(),
  usesRelativeDates: z.boolean(),
})

export const ColumnSchema = z.object({
  index: z.number(),
  name: z.string(),
  sortDirection: z.string(),
  width: z.number(),
  minimumWidth: z.number(),
  maximumWidth: z.number(),
  visible: z.boolean(),
})

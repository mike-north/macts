/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { Priv } from './contract/index.js'

export type { Edfm } from './contract/index.js'

export type { Ipnl } from './contract/index.js'

export type { Pple } from './contract/index.js'

export type { Ecvw } from './contract/index.js'

export type { Earr } from './contract/index.js'

export type { Epos } from './contract/index.js'

export type { Sodr } from './contract/index.js'

export type { Elsv } from './contract/index.js'

export type { Lvic } from './contract/index.js'

export type { Isiz } from './contract/index.js'

export type { Sort } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Container } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ContainerCreateInput = import('./contract/index.js').ContainerCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ContainerUpdateInput = import('./contract/index.js').ContainerUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Disk } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DiskCreateInput = import('./contract/index.js').DiskCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DiskUpdateInput = import('./contract/index.js').DiskUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FolderCreateInput = import('./contract/index.js').FolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FolderUpdateInput = import('./contract/index.js').FolderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { File } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FileCreateInput = import('./contract/index.js').FileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FileUpdateInput = import('./contract/index.js').FileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AliasFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AliasFileCreateInput = import('./contract/index.js').AliasFileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AliasFileUpdateInput = import('./contract/index.js').AliasFileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ApplicationFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ApplicationFileCreateInput = import('./contract/index.js').ApplicationFileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ApplicationFileUpdateInput = import('./contract/index.js').ApplicationFileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { DocumentFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DocumentFileCreateInput = import('./contract/index.js').DocumentFileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DocumentFileUpdateInput = import('./contract/index.js').DocumentFileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { InternetLocationFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type InternetLocationFileCreateInput =
  import('./contract/index.js').InternetLocationFileCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type InternetLocationFileUpdateInput =
  import('./contract/index.js').InternetLocationFileUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Clipping } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ClippingCreateInput = import('./contract/index.js').ClippingCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ClippingUpdateInput = import('./contract/index.js').ClippingUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Package } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PackageCreateInput = import('./contract/index.js').PackageCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PackageUpdateInput = import('./contract/index.js').PackageUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FinderWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FinderWindowCreateInput = Omit<
  import('./contract/index.js').FinderWindowCreateInput,
  'sidebarWidth'
> & {
  /** the width of the sidebar for the container window Numeric values are validated by the contract before dispatch. */
  sidebarWidth?:
    | number
    | Extract<import('./contract/index.js').FinderWindowCreateInput['sidebarWidth'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type FinderWindowUpdateInput = Omit<
  import('./contract/index.js').FinderWindowUpdateInput,
  'sidebarWidth'
> & {
  /** the width of the sidebar for the container window Numeric values are validated by the contract before dispatch. */
  sidebarWidth?:
    | number
    | Extract<import('./contract/index.js').FinderWindowUpdateInput['sidebarWidth'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ClippingWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ClippingWindowCreateInput = import('./contract/index.js').ClippingWindowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ClippingWindowUpdateInput = import('./contract/index.js').ClippingWindowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ListViewOptions } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ListViewOptionsCreateInput = Omit<
  import('./contract/index.js').ListViewOptionsCreateInput,
  'textSize'
> & {
  /** the size of the text displayed in the list view Numeric values are validated by the contract before dispatch. */
  textSize?:
    | number
    | Extract<import('./contract/index.js').ListViewOptionsCreateInput['textSize'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ListViewOptionsUpdateInput = Omit<
  import('./contract/index.js').ListViewOptionsUpdateInput,
  'textSize'
> & {
  /** the size of the text displayed in the list view Numeric values are validated by the contract before dispatch. */
  textSize?:
    | number
    | Extract<import('./contract/index.js').ListViewOptionsUpdateInput['textSize'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Column } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ColumnCreateInput = Omit<
  import('./contract/index.js').ColumnCreateInput,
  'index' | 'width'
> & {
  /** the index in the front-to-back ordering within its container Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').ColumnCreateInput['index'], null>
  /** the width of this column Numeric values are validated by the contract before dispatch. */
  width?: number | Extract<import('./contract/index.js').ColumnCreateInput['width'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ColumnUpdateInput = Omit<
  import('./contract/index.js').ColumnUpdateInput,
  'index' | 'width'
> & {
  /** the index in the front-to-back ordering within its container Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').ColumnUpdateInput['index'], null>
  /** the width of this column Numeric values are validated by the contract before dispatch. */
  width?: number | Extract<import('./contract/index.js').ColumnUpdateInput['width'], null>
}

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ContainerSchema = z.object({
  entireContents: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FileSchema = z.object({
  fileType: z.string(),
  creatorType: z.string(),
  stationery: z.boolean(),
  productVersion: z.string(),
  version: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AliasFileSchema = z.object({
  originalItem: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ApplicationFileSchema = z.object({
  id: z.string(),
  acceptsHighLevelEvents: z.boolean(),
  hasScriptingTerminology: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DocumentFileSchema = z.object({})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const InternetLocationFileSchema = z.object({
  location: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ClippingSchema = z.object({
  clippingWindow: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PackageSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FinderWindowSchema = z.object({
  target: z.string(),
  currentView: z.string(),
  iconViewOptions: z.string(),
  columnViewOptions: z.string(),
  toolbarVisible: z.boolean(),
  statusbarVisible: z.boolean(),
  pathbarVisible: z.boolean(),
  sidebarWidth: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ClippingWindowSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ListViewOptionsSchema = z.object({
  calculatesFolderSizes: z.boolean(),
  showsIconPreview: z.boolean(),
  iconSize: z.string(),
  textSize: z.number(),
  usesRelativeDates: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ColumnSchema = z.object({
  index: z.number(),
  name: z.string(),
  sortDirection: z.string(),
  width: z.number(),
  minimumWidth: z.number(),
  maximumWidth: z.number(),
  visible: z.boolean(),
})

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
export type { ContainerCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ContainerUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Disk } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DiskCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DiskUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { File } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AliasFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AliasFileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AliasFileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ApplicationFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ApplicationFileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ApplicationFileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { DocumentFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DocumentFileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DocumentFileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { InternetLocationFile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { InternetLocationFileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { InternetLocationFileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Clipping } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ClippingCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ClippingUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Package } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PackageCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PackageUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FinderWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FinderWindowCreateInput = Omit<
  import('./contract/index.js').FinderWindowCreateInput,
  'sidebarWidth'
> & {
  /** the width of the sidebar for the container window Numeric values are validated by the contract before dispatch. */
  sidebarWidth?: null extends import('./contract/index.js').FinderWindowCreateInput['sidebarWidth']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type FinderWindowUpdateInput = Omit<
  import('./contract/index.js').FinderWindowUpdateInput,
  'sidebarWidth'
> & {
  /** the width of the sidebar for the container window Numeric values are validated by the contract before dispatch. */
  sidebarWidth?: null extends import('./contract/index.js').FinderWindowUpdateInput['sidebarWidth']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ClippingWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ClippingWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ClippingWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ListViewOptions } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ListViewOptionsCreateInput = Omit<
  import('./contract/index.js').ListViewOptionsCreateInput,
  'textSize'
> & {
  /** the size of the text displayed in the list view Numeric values are validated by the contract before dispatch. */
  textSize?: null extends import('./contract/index.js').ListViewOptionsCreateInput['textSize']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ListViewOptionsUpdateInput = Omit<
  import('./contract/index.js').ListViewOptionsUpdateInput,
  'textSize'
> & {
  /** the size of the text displayed in the list view Numeric values are validated by the contract before dispatch. */
  textSize?: null extends import('./contract/index.js').ListViewOptionsUpdateInput['textSize']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Column } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ColumnCreateInput = Omit<
  import('./contract/index.js').ColumnCreateInput,
  'index' | 'width'
> & {
  /** the index in the front-to-back ordering within its container Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').ColumnCreateInput['index']
    ? number | null
    : number
  /** the width of this column Numeric values are validated by the contract before dispatch. */
  width?: null extends import('./contract/index.js').ColumnCreateInput['width']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ColumnUpdateInput = Omit<
  import('./contract/index.js').ColumnUpdateInput,
  'index' | 'width'
> & {
  /** the index in the front-to-back ordering within its container Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').ColumnUpdateInput['index']
    ? number | null
    : number
  /** the width of this column Numeric values are validated by the contract before dispatch. */
  width?: null extends import('./contract/index.js').ColumnUpdateInput['width']
    ? number | null
    : number
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

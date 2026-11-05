/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MediaItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MediaItemCreateInput = Omit<
  import('./contract/index.js').MediaItemCreateInput,
  'size'
> & {
  /** The selected media item file size Numeric values are validated by the contract before dispatch. */
  size?: null extends import('./contract/index.js').MediaItemCreateInput['size']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type MediaItemUpdateInput = Omit<
  import('./contract/index.js').MediaItemUpdateInput,
  'size'
> & {
  /** The selected media item file size Numeric values are validated by the contract before dispatch. */
  size?: null extends import('./contract/index.js').MediaItemUpdateInput['size']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Container } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ContainerCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ContainerUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Album } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AlbumCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AlbumUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Moment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MomentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MomentUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MediaItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  filename: z.string(),
  date: z.string(),
  height: z.number(),
  width: z.number(),
  altitude: z.number(),
  location: z.unknown(),
  favorite: z.boolean(),
  keywords: z.array(z.string()),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MomentSchema = z.object({
  id: z.string(),
  name: z.string(),
})

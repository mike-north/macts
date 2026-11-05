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
  size?: number | Extract<import('./contract/index.js').MediaItemCreateInput['size'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type MediaItemUpdateInput = Omit<
  import('./contract/index.js').MediaItemUpdateInput,
  'size'
> & {
  /** The selected media item file size Numeric values are validated by the contract before dispatch. */
  size?: number | Extract<import('./contract/index.js').MediaItemUpdateInput['size'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Container } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ContainerCreateInput = import('./contract/index.js').ContainerCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ContainerUpdateInput = import('./contract/index.js').ContainerUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Album } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AlbumCreateInput = import('./contract/index.js').AlbumCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AlbumUpdateInput = import('./contract/index.js').AlbumUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FolderCreateInput = import('./contract/index.js').FolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FolderUpdateInput = import('./contract/index.js').FolderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Moment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MomentCreateInput = import('./contract/index.js').MomentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MomentUpdateInput = import('./contract/index.js').MomentUpdateInput

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

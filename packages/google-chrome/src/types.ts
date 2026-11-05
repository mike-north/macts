/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Window } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type WindowCreateInput = Omit<
  import('./contract/index.js').WindowCreateInput,
  'index' | 'activeTabIndex'
> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').WindowCreateInput['index'], null>
  /** The index of the active tab. Numeric values are validated by the contract before dispatch. */
  activeTabIndex?:
    | number
    | Extract<import('./contract/index.js').WindowCreateInput['activeTabIndex'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type WindowUpdateInput = Omit<
  import('./contract/index.js').WindowUpdateInput,
  'index' | 'activeTabIndex'
> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').WindowUpdateInput['index'], null>
  /** The index of the active tab. Numeric values are validated by the contract before dispatch. */
  activeTabIndex?:
    | number
    | Extract<import('./contract/index.js').WindowUpdateInput['activeTabIndex'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TabCreateInput = import('./contract/index.js').TabCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TabUpdateInput = import('./contract/index.js').TabUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BookmarkFolder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BookmarkFolderCreateInput = import('./contract/index.js').BookmarkFolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BookmarkFolderUpdateInput = import('./contract/index.js').BookmarkFolderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BookmarkItem } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BookmarkItemCreateInput = import('./contract/index.js').BookmarkItemCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BookmarkItemUpdateInput = import('./contract/index.js').BookmarkItemUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WindowSchema = z.object({
  givenName: z.string(),
  name: z.string(),
  id: z.string(),
  index: z.number(),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  closeable: z.boolean(),
  minimizable: z.boolean(),
  minimized: z.boolean(),
  resizable: z.boolean(),
  visible: z.boolean(),
  zoomable: z.boolean(),
  zoomed: z.boolean(),
  activeTab: z.string(),
  mode: z.string(),
  activeTabIndex: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  loading: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BookmarkFolderSchema = z.object({
  id: z.string(),
  title: z.string(),
  index: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BookmarkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  index: z.number(),
})

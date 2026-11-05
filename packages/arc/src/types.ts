/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Window } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type WindowCreateInput = Omit<import('./contract/index.js').WindowCreateInput, 'index'> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').WindowCreateInput['index']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type WindowUpdateInput = Omit<import('./contract/index.js').WindowUpdateInput, 'index'> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: null extends import('./contract/index.js').WindowUpdateInput['index']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TabCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TabUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Space } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SpaceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SpaceUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WindowSchema = z.object({
  id: z.string(),
  name: z.string(),
  index: z.number(),
  closeable: z.boolean(),
  minimizable: z.boolean(),
  minimized: z.boolean(),
  resizable: z.boolean(),
  visible: z.boolean(),
  zoomable: z.boolean(),
  zoomed: z.boolean(),
  incognito: z.boolean(),
  mode: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabSchema = z.object({
  id: z.string(),
  title: z.string(),
  uRL: z.string(),
  loading: z.boolean(),
  location: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SpaceSchema = z.object({
  id: z.string(),
  title: z.string(),
})

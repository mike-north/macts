/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Document } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DocumentCreateInput = import('./contract/index.js').DocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DocumentUpdateInput = import('./contract/index.js').DocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TabCreateInput = import('./contract/index.js').TabCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TabUpdateInput = import('./contract/index.js').TabUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DocumentSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
  source: z.string(),
  text: z.string(),
})

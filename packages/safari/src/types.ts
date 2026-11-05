/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Document } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DocumentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DocumentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TabCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TabUpdateInput } from './contract/index.js'

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

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

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  path: z.string().optional(),
  modified: z.boolean(),
})

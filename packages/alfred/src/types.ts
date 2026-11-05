/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Application } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ApplicationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ApplicationUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ApplicationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
})

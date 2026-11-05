/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Pane } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PaneCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PaneUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Anchor } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AnchorCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AnchorUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PaneSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AnchorSchema = z.object({
  name: z.string(),
})

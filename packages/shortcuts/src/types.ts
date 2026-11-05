/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Shortcut } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ShortcutCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ShortcutUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ShortcutSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  id: z.string(),
  folder: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  icon: z.string(),
  acceptsInput: z.boolean(),
  actionCount: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
  name: z.string(),
  id: z.string(),
})

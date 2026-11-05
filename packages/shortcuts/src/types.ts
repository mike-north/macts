/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Shortcut } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ShortcutCreateInput = import('./contract/index.js').ShortcutCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ShortcutUpdateInput = import('./contract/index.js').ShortcutUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FolderCreateInput = import('./contract/index.js').FolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FolderUpdateInput = import('./contract/index.js').FolderUpdateInput

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

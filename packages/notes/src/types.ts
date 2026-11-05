/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Account } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AccountCreateInput = import('./contract/index.js').AccountCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AccountUpdateInput = import('./contract/index.js').AccountUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FolderCreateInput = import('./contract/index.js').FolderCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FolderUpdateInput = import('./contract/index.js').FolderUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Note } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type NoteCreateInput = import('./contract/index.js').NoteCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type NoteUpdateInput = import('./contract/index.js').NoteUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attachment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AttachmentCreateInput = import('./contract/index.js').AttachmentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AttachmentUpdateInput = import('./contract/index.js').AttachmentUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AccountSchema = z.object({
  name: z.string(),
  id: z.string(),
  upgraded: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
  name: z.string(),
  id: z.string(),
  shared: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const NoteSchema = z.object({
  name: z.string(),
  id: z.string(),
  body: z.string(),
  plaintext: z.string(),
  creationDate: z.string(),
  modificationDate: z.string(),
  shared: z.boolean(),
  passwordProtected: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AttachmentSchema = z.object({
  name: z.string(),
  id: z.string(),
  contentIdentifier: z.string().optional(),
  creationDate: z.string(),
  modificationDate: z.string(),
})

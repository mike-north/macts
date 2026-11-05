/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Account } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AccountCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AccountUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Note } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { NoteCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { NoteUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attachment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AttachmentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AttachmentUpdateInput } from './contract/index.js'

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

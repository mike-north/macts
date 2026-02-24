/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A Notes account */
export interface Account {
  /** The name of the account */
  name: string
  /** The unique identifier of the account */
  id: string
  /** Whether the account has been upgraded */
  upgraded: boolean
}

/** Input for creating a Account */
export type AccountCreateInput = Record<string, never>

/** Input for updating a Account */
export type AccountUpdateInput = Partial<AccountCreateInput>

/** A Notes folder */
export interface Folder {
  /** The name of the folder */
  name: string
  /** The unique identifier of the folder */
  id: string
  /** The container of the folder */
  container?: string
  /** Whether the folder is shared */
  shared: boolean
}

/** Input for creating a Folder */
export interface FolderCreateInput {
  /** The name of the folder */
  name?: string
}

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>

/** A note */
export interface Note {
  /** The name of the note (first line) */
  name: string
  /** The unique identifier of the note */
  id: string
  /** The HTML content of the note body */
  body: string
  /** The plaintext content of the note */
  plaintext: string
  /** The creation date of the note */
  creationDate: string
  /** The modification date of the note */
  modificationDate: string
  /** Whether the note is shared */
  shared: boolean
  /** Whether the note is password protected */
  passwordProtected: boolean
}

/** Input for creating a Note */
export interface NoteCreateInput {
  /** The name of the note (first line) */
  name?: string
  /** The HTML content of the note body */
  body?: string
}

/** Input for updating a Note */
export type NoteUpdateInput = Partial<NoteCreateInput>

/** A note attachment */
export interface Attachment {
  /** The name of the attachment */
  name: string
  /** The unique identifier of the attachment */
  id: string
  /** The content identifier of the attachment */
  contentIdentifier?: string
  /** The creation date of the attachment */
  creationDate: string
  /** The modification date of the attachment */
  modificationDate: string
}

/** Input for creating a Attachment */
export type AttachmentCreateInput = Record<string, never>

/** Input for updating a Attachment */
export type AttachmentUpdateInput = Partial<AttachmentCreateInput>

// Zod schemas for runtime validation

export const AccountSchema = z.object({
  name: z.string(),
  id: z.string(),
  upgraded: z.boolean(),
})

export const FolderSchema = z.object({
  name: z.string(),
  id: z.string(),
  container: z.string().optional(),
  shared: z.boolean(),
})

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

export const AttachmentSchema = z.object({
  name: z.string(),
  id: z.string(),
  contentIdentifier: z.string().optional(),
  creationDate: z.string(),
  modificationDate: z.string(),
})

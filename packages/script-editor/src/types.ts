/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A Script Editor document */
export interface Document {
  /** Canonical identifier (mirrors `name`); populated by list, pass to get/delete and to write operations that reference this resource. */
  id?: string
  /** The name of the document */
  name: string
  /** The file path of the document */
  path?: string
  /** The source code of the script */
  contents: string
  /** The scripting language (AppleScript or JavaScript) */
  language: string
  /** Whether the document has been modified since last save */
  modified: boolean
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** The name of the document */
  name?: string
  /** Initial script contents */
  contents?: string
  /** The scripting language (AppleScript or JavaScript) */
  language?: string
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  path: z.string().optional(),
  contents: z.string(),
  language: z.string(),
  modified: z.boolean(),
})

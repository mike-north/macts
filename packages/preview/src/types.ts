/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A Preview document */
export interface Document {
  /** Canonical identifier (mirrors `name`); populated by list, pass to get/delete and to write operations that reference this resource. */
  id?: string
  /** The name of the document */
  name: string
  /** The file path of the document */
  path?: string
  /** Whether the document has been modified since last save */
  modified: boolean
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** The name of the document */
  name?: string
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  path: z.string().optional(),
  modified: z.boolean(),
})

/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Level of detail for system profile information */
export type DetailLevel = 'mini' | 'basic' | 'full'

/** A system profile document */
export interface Document {
  /** The document name */
  name: string
  /** Plain text representation of the system profile document */
  plainText: string
  /** XML representation of the system profile document */
  xmlText: string
  /** The desired level of detail for the system profile document */
  detailLevel: DetailLevel
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** The desired level of detail for the system profile document */
  detailLevel?: DetailLevel
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  name: z.string(),
  plainText: z.string(),
  xmlText: z.string(),
  detailLevel: z.string(),
})

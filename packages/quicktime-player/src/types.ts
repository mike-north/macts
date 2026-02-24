/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A QuickTime Player document */
export interface Document {
  /** The document name */
  name: string
  /** The unique identifier of the document */
  id: string
  /** The file path of the document */
  path: string
  /** Whether the document is currently playing */
  playing: boolean
  /** The duration of the document in seconds */
  duration: number
  /** The current playback time in seconds */
  currentTime: number
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** Whether the document is currently playing */
  playing?: boolean
  /** The current playback time in seconds */
  currentTime?: number
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  name: z.string(),
  id: z.string(),
  path: z.string(),
  playing: z.boolean(),
  duration: z.number(),
  currentTime: z.number(),
})

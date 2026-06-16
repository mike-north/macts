/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** The Alfred application */
export interface Application {
  /** Canonical identifier (mirrors `name`); populated by list, pass to get/delete and to write operations that reference this resource. */
  id?: string
  /** The name of the application */
  name: string
}

/** Input for creating a Application */
export type ApplicationCreateInput = Record<string, never>

/** Input for updating a Application */
export type ApplicationUpdateInput = Partial<ApplicationCreateInput>

// Zod schemas for runtime validation

export const ApplicationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
})

import { z } from 'zod'
import { PropertySchema } from './property.js'

/**
 * Identifier configuration for a resource.
 */
export const IdentifierSchema = z.object({
  /** Property name used as identifier */
  property: z.string(),
  /** Whether this is the primary identifier */
  primary: z.boolean().default(false),
})
export type Identifier = z.infer<typeof IdentifierSchema>

/**
 * Schema for a resource type definition.
 */
export const ResourceSchema = z.object({
  /** Resource name (singular, PascalCase) */
  name: z.string(),
  /** Plural form for collections */
  plural: z.string(),
  /** Human-readable description */
  description: z.string(),
  /** Reference to JSON Schema file for full data shape */
  schema: z.string().optional(),
  /** AppleScript four-character code */
  code: z.string().min(1).max(4).optional(),
  /** Property definitions */
  properties: z.preprocess((val) => val ?? {}, z.record(z.string(), PropertySchema)),
  /** Identifier configuration */
  identifiers: z.array(IdentifierSchema).optional(),
})
export type Resource = z.infer<typeof ResourceSchema>

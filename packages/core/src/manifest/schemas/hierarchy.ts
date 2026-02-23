import { z } from 'zod'
import { PropertyAccessSchema } from './property.js'

/**
 * Schema for a child in the containment hierarchy.
 */
export const HierarchyChildSchema: z.ZodType<{
  resource: string
  access: 'r' | 'rw'
  description?: string | undefined
  children?: Record<string, HierarchyChild> | undefined
}> = z.lazy(() =>
  z.object({
    /** Reference to resource type */
    resource: z.string(),
    /** Access mode: rw = can create/delete, r = read-only */
    access: PropertyAccessSchema,
    /** Human-readable description of this relationship */
    description: z.string().optional(),
    /** Nested children (recursive) */
    children: z.record(z.string(), HierarchyChildSchema).optional(),
  })
)
export type HierarchyChild = z.infer<typeof HierarchyChildSchema>

/**
 * Schema for the application-level hierarchy.
 */
export const HierarchySchema = z.object({
  /** Root children directly under the application */
  children: z.record(z.string(), HierarchyChildSchema),
})
export type Hierarchy = z.infer<typeof HierarchySchema>

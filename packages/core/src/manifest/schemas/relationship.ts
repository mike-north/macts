import { z } from 'zod';

/**
 * Relationship cardinality.
 */
export const CardinalitySchema = z.enum([
  'one-to-one',
  'one-to-many',
  'many-to-one',
  'many-to-many',
]);
export type Cardinality = z.infer<typeof CardinalitySchema>;

/**
 * Schema for non-hierarchical relationships between resources.
 */
export const RelationshipSchema = z.object({
  /** Relationship name */
  name: z.string(),
  /** Source resource type */
  from: z.string(),
  /** Target resource type */
  to: z.string(),
  /** Cardinality */
  cardinality: CardinalitySchema,
  /** Property on source that holds the reference */
  property: z.string().optional(),
  /** Human-readable description */
  description: z.string().optional(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

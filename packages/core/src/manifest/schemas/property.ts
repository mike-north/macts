import { z } from 'zod';

/**
 * Property access mode - whether a property is read-only or read-write.
 */
export const PropertyAccessSchema = z.enum(['r', 'rw']);
export type PropertyAccess = z.infer<typeof PropertyAccessSchema>;

/**
 * Primitive property types supported by AppleScript/JXA.
 */
export const PrimitiveTypeSchema = z.enum([
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'data', // binary data
  'any', // untyped
  'file', // file reference
  'point', // {x, y}
  'rect', // {x, y, width, height}
  'rgb', // {red, green, blue}
]);
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>;

/**
 * Property type - can be primitive, array, resource reference, or enum reference.
 */
export const PropertyTypeSchema: z.ZodType<
  PrimitiveType | { array: PropertyType } | { resource: string } | { enum: string }
> = z.union([
  PrimitiveTypeSchema,
  z
    .object({
      array: z.lazy(() => PropertyTypeSchema),
    })
    .strict(),
  z
    .object({
      resource: z.string().min(1), // Reference to a resource type
    })
    .strict(),
  z
    .object({
      enum: z.string().min(1), // Reference to an enum type
    })
    .strict(),
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

/**
 * Schema for a single property definition.
 */
export const PropertySchema = z.object({
  /** Property access mode */
  access: PropertyAccessSchema,
  /** Property type (defaults to 'string' if omitted) */
  type: PropertyTypeSchema.optional(),
  /** Human-readable description */
  description: z.string().min(1),
  /** AppleScript four-character code */
  code: z.string().length(4).optional(),
  /** Default value */
  default: z.unknown().optional(),
  /** Whether this property is optional */
  optional: z.boolean().default(false),
  /** Deprecation info */
  deprecated: z
    .object({
      message: z.string().min(1),
      since: z.string().optional(),
    })
    .optional(),
});
export type Property = z.infer<typeof PropertySchema>;

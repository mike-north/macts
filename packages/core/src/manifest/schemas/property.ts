import { z } from 'zod'
import {
  NullabilityEvidenceSchema,
  ResettabilityEvidenceSchema,
  checkNullabilityClaim,
} from './evidence.js'

/**
 * Property access mode - whether a property is read-only or read-write.
 */
export const PropertyAccessSchema = z.enum(['r', 'rw'])
export type PropertyAccess = z.infer<typeof PropertyAccessSchema>

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
])
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>

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
])
export type PropertyType = z.infer<typeof PropertyTypeSchema>

/**
 * The evidence behind a property's nullability and resettability claims.
 */
export const PropertyEvidenceSchema = z.object({
  /** Evidence for {@link PropertySchema}'s `nullable` claim. */
  nullable: NullabilityEvidenceSchema.optional(),
  /** Evidence for {@link PropertySchema}'s `resettable` claim. */
  resettable: ResettabilityEvidenceSchema.optional(),
})
export type PropertyEvidence = z.infer<typeof PropertyEvidenceSchema>

/**
 * Schema for a single property definition.
 *
 * @remarks
 * `optional` and `nullable` are separate axes: `optional` says whether the
 * property may be absent from a record, and `nullable` whether a present
 * property may hold no value. `resettable` says whether an update can clear
 * the property by setting it to `null`. A nullability or resettability claim
 * must carry its evidence (see `./evidence.ts`); without a claim, generators
 * apply their defaults.
 */
export const PropertySchema = z
  .object({
    /** Property access mode */
    access: PropertyAccessSchema,
    /** Property type (defaults to 'string' if omitted) */
    type: PropertyTypeSchema.optional(),
    /** Human-readable description */
    description: z.string().min(1),
    /** AppleScript four-character code */
    code: z.string().min(1).max(4).optional(),
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
    /**
     * Whether a read can find the property empty (the app's "missing value").
     * Absent means there is no evidence either way.
     */
    nullable: z.boolean().optional(),
    /**
     * Whether an update can reset the property by setting it to `null`. Absent
     * means it cannot, as far as anyone has verified.
     */
    resettable: z.boolean().optional(),
    /** The evidence for `nullable` and `resettable`. */
    evidence: PropertyEvidenceSchema.optional(),
  })
  .superRefine((property, ctx) => {
    checkNullabilityClaim(property, ctx)
    const evidence = property.evidence?.resettable
    if (property.resettable === true && evidence === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'A resettable claim needs evidence: set evidence.resettable.',
        path: ['evidence', 'resettable'],
      })
    }
    if (property.resettable !== true && evidence !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Resettability evidence needs a claim: set resettable: true.',
        path: ['resettable'],
      })
    }
  })
export type Property = z.infer<typeof PropertySchema>

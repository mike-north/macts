import { z } from 'zod'
import { possibleValueKinds } from '../value-kinds.js'
import {
  DictionaryTermEvidenceSchema,
  NullabilityEvidenceSchema,
  ResettabilityEvidenceSchema,
  UnsupportedSchema,
  checkNullabilityClaim,
  type Unsupported,
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
 * The app's own spelling of a property, recorded where it differs from the
 * property's manifest key, with the dictionary term that shows it.
 *
 * The key stays the property's public name in every generated surface and in
 * every record returned to a caller; native bodies address the property in the
 * app by this name instead (see `../native-accessor.ts`). Recording a name
 * equal to the key is redundant and rejected, in `ResourceSchema`, which knows
 * the key.
 */
export const PropertyNativeSpellingSchema = z
  .object({
    /** The name the automation bridge resolves for the property, e.g. `ansiBlackColor`. */
    name: z.string().min(1),
    /** The dictionary term the name is the bridge's spelling of. */
    evidence: DictionaryTermEvidenceSchema,
  })
  .strict()
export type PropertyNativeSpelling = z.infer<typeof PropertyNativeSpellingSchema>

/**
 * Schema for a single property definition.
 *
 * @remarks
 * `optional` and `nullable` are separate axes: `optional` says whether the
 * property may be absent from a record, and `nullable` whether a present
 * property may hold no value. `resettable` says whether an update can clear
 * the property by setting it to `null`. A nullability or resettability claim
 * must carry its evidence (see `./evidence.ts`); without a claim, generators
 * apply their defaults. `unsupported` marks a declared property that cannot
 * be used at runtime (the app cannot provide it, or returns values the
 * generated code cannot decode yet): generated surfaces omit it, and it
 * carries no nullability or resettability claim and no native spelling. Kind
 * evidence must show only kinds the declared type does not expect. `native`
 * records the app's own spelling of the property where it differs from the key.
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
    /**
     * Set when the property cannot be used at runtime, with the evidence.
     * Generated surfaces omit a property marked unsupported.
     */
    unsupported: UnsupportedSchema.optional(),
    /**
     * The app's own spelling of the property, where it differs from the key.
     * Absent means the app spells it as the key.
     */
    native: PropertyNativeSpellingSchema.optional(),
  })
  .superRefine((property, ctx) => {
    if (property.unsupported !== undefined && property.native !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          'An unsupported property cannot record a native spelling: no body addresses it in the app.',
        path: ['native'],
      })
    }
    if (
      property.unsupported !== undefined &&
      (property.nullable !== undefined || property.resettable !== undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'An unsupported property cannot carry a nullable or resettable claim: every surface leaves it out.',
        path: ['unsupported'],
      })
    }
    checkUnsupportedKinds(property, ctx)
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

/**
 * The claims a resource makes about a property it inherits, without
 * redeclaring the property: a claims-only overlay (D10, "Superclasses").
 *
 * An inherited property carries its ancestor's claims, observed on the
 * ancestor's class. A subclass that has its own evidence states the claim
 * here instead of copying the ancestor's declaration, so the declaration
 * stays the ancestor's and cannot drift. Each claim it states replaces the
 * inherited one: the nullability claim (`nullable` with `evidence.nullable`),
 * the resettability claim (`resettable` with `evidence.resettable`), and the
 * `unsupported` marker. A marker also drops the inherited nullability and
 * resettability claims and the native spelling, which an unsupported property
 * cannot carry. A claim and its evidence follow the rules they follow on a
 * declaration.
 */
export const PropertyClaimsSchema = z
  .object({
    /** The nullability claim, as on a declaration. */
    nullable: z.boolean().optional(),
    /** The resettability claim, as on a declaration. */
    resettable: z.boolean().optional(),
    /** The evidence for the claims stated here. */
    evidence: PropertyEvidenceSchema.optional(),
    /** The marker, as on a declaration. */
    unsupported: UnsupportedSchema.optional(),
  })
  .strict()
  .superRefine((claims, ctx) => {
    if (
      claims.nullable === undefined &&
      claims.resettable === undefined &&
      claims.evidence === undefined &&
      claims.unsupported === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'A claims-only overlay states at least one claim: nullable, resettable or unsupported, with its evidence.',
        path: [],
      })
    }
    if (
      claims.unsupported !== undefined &&
      (claims.nullable !== undefined || claims.resettable !== undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'An unsupported property cannot carry a nullable or resettable claim: every surface leaves it out.',
        path: ['unsupported'],
      })
    }
    checkNullabilityClaim(claims, ctx)
    const evidence = claims.evidence?.resettable
    if (claims.resettable === true && evidence === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'A resettable claim needs evidence: set evidence.resettable.',
        path: ['evidence', 'resettable'],
      })
    }
    if (claims.resettable !== true && evidence !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Resettability evidence needs a claim: set resettable: true.',
        path: ['resettable'],
      })
    }
  })
export type PropertyClaims = z.infer<typeof PropertyClaimsSchema>

/**
 * An `unsupported` marker's kind evidence must contradict the declared type:
 * the type must have expected kinds, and no observed kind may be one of them.
 * The property's schema cannot see the manifest's resources and enums, so a
 * named type counts as expecting both a reference and a string
 * (`possibleValueKinds`); the check never accepts a kind the resolved type
 * would expect.
 */
function checkUnsupportedKinds(
  property: {
    readonly type?: PropertyType | undefined
    readonly unsupported?: Unsupported | undefined
  },
  ctx: z.RefinementCtx
): void {
  const evidence = property.unsupported?.evidence
  if (evidence === undefined || !('observedKinds' in evidence)) return
  const expected = possibleValueKinds(property.type)
  if (expected === undefined) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Kind evidence needs a declared type with expected kinds; this type is not checked, so no kind contradicts it.',
      path: ['unsupported', 'evidence', 'observedKinds'],
    })
    return
  }
  for (const kind of expected) {
    if (evidence.observedKinds[kind] !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `The declared type expects ${kind} values, so observing them is no evidence the property cannot be decoded.`,
        path: ['unsupported', 'evidence', 'observedKinds', kind],
      })
    }
  }
}

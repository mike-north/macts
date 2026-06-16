import { z } from 'zod'
import { PropertySchema } from './property.js'

/**
 * How the structured/runtime layer addresses a resource by its identifier.
 *
 * - `byId` (default): the JXA `byId(value)` accessor — correct when the app's
 *   scripting dictionary exposes a real id specifier that works at runtime.
 * - `byProperty`: a `whose({ <property>: value })[0]` lookup — used when the
 *   dictionary-declared identifier is NOT runtime-valid (throws via JXA) and the
 *   resource must instead be matched on a property that does work (e.g. matching
 *   a Calendar on its `name`, since `calendarIdentifier()` throws at runtime).
 */
export const IdentifierTargetingSchema = z.enum(['byId', 'byProperty'])
export type IdentifierTargeting = z.infer<typeof IdentifierTargetingSchema>

/**
 * Identifier configuration for a resource.
 */
export const IdentifierSchema = z.object({
  /** Property name used as identifier */
  property: z.string(),
  /** Whether this is the primary identifier */
  primary: z.boolean().default(false),
  /**
   * How the runtime layer targets the resource by this identifier.
   *
   * Optional; absent means `byId` (the default). Keeping this optional (rather
   * than `.default('byId')`) avoids widening the inferred `Identifier` type with
   * a required field, which would break every already-generated plugin manifest
   * literal cast `as AppManifest`. Set `byProperty` when the dictionary-declared
   * identifier is not runtime-valid via JXA and the resource must be matched on a
   * working property instead. Consumers resolve the effective strategy via
   * `resolveIdentifierTargeting`, which applies the `byId` default.
   */
  targeting: IdentifierTargetingSchema.optional(),
  /**
   * The JXA property name to match on when `targeting` is `byProperty`.
   *
   * Optional: when omitted, the runtime layer matches on `property`. Provide it
   * only when the value-carrying property differs from the property the runtime
   * `whose({ ... })` clause must match (it is the same in the common case).
   */
  runtimeProperty: z.string().optional(),
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

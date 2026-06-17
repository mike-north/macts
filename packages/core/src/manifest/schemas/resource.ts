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
 * Status of a runtime identifier probe against the live app.
 *
 * - `probed`    – probe ran successfully, result is in `runtimeIdentifier`
 * - `no-items`  – the resource's collection was empty; could not probe
 * - `failed`    – probe ran but every candidate identifier threw or returned nothing
 * - `error`     – an unexpected error prevented the probe from completing
 */
export const ProbeStatusSchema = z.enum(['probed', 'no-items', 'failed', 'error'])
export type ProbeStatus = z.infer<typeof ProbeStatusSchema>

/**
 * Runtime-probe metadata persisted on a resource after running `macts probe`.
 *
 * The sdef-declared identifier is preserved in `identifiers` for provenance;
 * this section records which property *actually* works at runtime.
 */
export const RuntimeProbeSchema = z.object({
  /**
   * The property that returned a non-null value when probed against the first
   * item of the resource's collection.  Absent when `status` is not `probed`.
   */
  runtimeIdentifier: z.string().optional(),
  /** Disposition of the last probe run */
  status: ProbeStatusSchema,
  /** Wall-clock timestamp when the probe ran (ISO 8601) */
  probedAt: z.string().optional(),
  /** Human-readable note about what happened (e.g. the error message) */
  note: z.string().optional(),
})
export type RuntimeProbe = z.infer<typeof RuntimeProbeSchema>

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
  /** Identifier configuration (sdef-declared, kept for provenance) */
  identifiers: z.array(IdentifierSchema).optional(),
  /**
   * Runtime-probe metadata written by `macts probe`.
   *
   * Absent until the probe has been run against the live app.  When present,
   * `runtimeIdentifier` is the property that actually works at runtime —
   * consumers (executor, code generator) SHOULD prefer it over the sdef-declared
   * primary identifier.
   */
  probe: RuntimeProbeSchema.optional(),
})
export type Resource = z.infer<typeof ResourceSchema>

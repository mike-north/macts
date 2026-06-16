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

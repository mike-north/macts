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
 * Outcome of a nullability probe of one resource.
 *
 * - `probed`      – items were read; their properties' evidence is recorded
 * - `no-items`    – the collection was reachable but empty
 * - `unreachable` – the collection could not be reached from the app
 * - `budget`      – the probe's time budget ran out before this resource
 * - `error`       – the probe of this resource failed as a whole
 */
export const NullabilityProbeStatusSchema = z.enum([
  'probed',
  'no-items',
  'unreachable',
  'budget',
  'error',
])
export type NullabilityProbeStatus = z.infer<typeof NullabilityProbeStatusSchema>

/**
 * Record of the last nullability probe of a resource, written by
 * `macts probe --nullability`.
 *
 * It is separate from the identifier {@link RuntimeProbeSchema | probe}
 * block: it describes how the per-property nullability evidence was gathered
 * (which app build and macOS version, how the collection was reached, and how
 * many items were read), and names the properties it deliberately did not
 * read. It never contains an observed value.
 */
export const NullabilityProbeSchema = z.object({
  /** When the probe ran (ISO 8601). */
  observedAt: z.string().min(1),
  /** The bundle identifier of the probed app. */
  bundleId: z.string().min(1),
  /** The probed app's version. */
  appVersion: z.string().min(1),
  /** The macOS product version the app ran on, e.g. `27.2`. */
  osVersion: z.string().min(1),
  /**
   * How the probe reached the resource's items from the app: the chain of
   * collections, e.g. `calendars/events`.
   */
  accessPath: z.string(),
  /** How many items the probe read. */
  itemsRead: z.number().int().nonnegative(),
  /** The outcome of the probe. */
  status: NullabilityProbeStatusSchema,
  /**
   * Properties the probe did not read, by name: file and data properties,
   * properties that hold large content, and any the caller excluded.
   */
  skipped: z.array(z.string()),
})
export type NullabilityProbe = z.infer<typeof NullabilityProbeSchema>

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
  /**
   * Record of the last nullability probe, written by
   * `macts probe --nullability`. Absent until that probe has run.
   */
  nullabilityProbe: NullabilityProbeSchema.optional(),
})
export type Resource = z.infer<typeof ResourceSchema>

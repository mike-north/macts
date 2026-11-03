import { z } from 'zod'
import { PropertySchema } from './property.js'
import {
  DictionarySpellingEvidenceSchema,
  IdentifierUniquenessEvidenceSchema,
  ObservedAtSchema,
  ResourceAbsenceEvidenceSchema,
} from './evidence.js'
import { resolvePrimaryIdentifierProperty } from '../identifier.js'
import { defaultCollectionAccessor } from '../native-accessor.js'

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
  /**
   * Whether no two items the collection holds at the same time share this
   * identifier's value, as `evidence.unique` shows. Absent means unknown,
   * which is treated as not unique: a list pages only when its resource's
   * primary identifier is claimed unique (see `listOperationPages`). The
   * claim is curated and independent of `targeting`: a property matched with
   * `byProperty` can be unique, and an id the app names "unique" can repeat.
   * The claim covers the value the runtime reads for this identifier: for
   * `byProperty`, the `runtimeProperty` when one is set.
   */
  unique: z.boolean().optional(),
  /** The evidence behind the claims above; `unique` needs it, and it needs `unique`. */
  evidence: z.object({ unique: IdentifierUniquenessEvidenceSchema.optional() }).strict().optional(),
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
  /** When the probe ran: an ISO 8601 UTC timestamp. */
  observedAt: ObservedAtSchema,
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
  /**
   * How many collections the items were drawn from: the parents (calendars,
   * lists, folders) of a nested resource, or 1 for a top-level collection.
   * Absent on blocks written before the probe spread its sample.
   */
  sampledParents: z.number().int().nonnegative().optional(),
  /**
   * How many parents the probe looked in for items, empty or not: 1 for a
   * top-level collection. For a nested resource the probe looks in evenly
   * spaced parents up to a limit, so this can be fewer than all of them.
   * Absent on blocks written before the probe recorded it.
   */
  parentsScanned: z.number().int().nonnegative().optional(),
  /** The outcome of the probe. */
  status: NullabilityProbeStatusSchema,
  /**
   * Properties the probe did not read, by name: file and data properties,
   * lists of references, properties that hold large content, properties
   * marked unsupported, and any the caller excluded.
   */
  skipped: z.array(z.string()),
  /**
   * Why fewer items were read than the probe could have, or why it failed:
   * e.g. `stopped at the time limit after 12 items`. Never contains an
   * observed value.
   */
  note: z.string().min(1).optional(),
})
export type NullabilityProbe = z.infer<typeof NullabilityProbeSchema>

/**
 * The form of a resource's `plural`: a Pascal case identifier of ASCII
 * letters only (`Notes`, `MediaItems`, `URLs`).
 *
 * The plural is the source of the resource's segment, the one spelling of the
 * resource in its routes, SDK accessors, tool names and derived permissions
 * (its lower camel case: `mediaItems`). Restricting it to letters, starting
 * with a capital, keeps every such segment a valid route segment and a valid
 * permission segment (`[a-z][a-zA-Z0-9]*`) by construction: a space, a digit,
 * punctuation or a leading lower-case letter could otherwise produce a
 * segment no route or grant can use.
 */
const RESOURCE_PLURAL_PATTERN = /^[A-Z][A-Za-z]*$/

/**
 * The app's own spelling of a resource's collection, recorded where it
 * differs from the spelling derived from the plural
 * (`defaultCollectionAccessor` in `../native-accessor.ts`), with the
 * dictionary term that shows it.
 *
 * The plural stays the source of the resource's public segment on every
 * surface; native bodies address the collection in the app by this accessor
 * instead. Recording the derived spelling is redundant and rejected.
 */
export const ResourceNativeSpellingSchema = z
  .object({
    /** The accessor the automation bridge resolves for the collection, e.g. `airplayDevices`. */
    collection: z.string().min(1),
    /** The dictionary term the accessor is the bridge's spelling of. */
    evidence: DictionarySpellingEvidenceSchema,
  })
  .strict()
export type ResourceNativeSpelling = z.infer<typeof ResourceNativeSpellingSchema>

/**
 * The marker on a resource the app cannot provide: its dictionary has no
 * collection for it, or the running app fails every read of it.
 *
 * The manifest keeps such a resource, so the record of what macts expected
 * stays complete and the omission stays auditable; every generated surface
 * (routes and the operations behind them, the contract, SDKs, tools, the CLI,
 * capabilities and derived permissions) leaves out the resource, its
 * hierarchy entries, and every entry nested under them. The marker is
 * curated, from the dictionary or a live read-only observation: no probe
 * writes or changes it.
 */
export const ResourceUnsupportedSchema = z
  .object({
    /** What the dictionary or the running app shows about the resource. */
    evidence: ResourceAbsenceEvidenceSchema,
  })
  .strict()
export type ResourceUnsupported = z.infer<typeof ResourceUnsupportedSchema>

/**
 * Schema for a resource type definition.
 */
export const ResourceSchema = z
  .object({
    /** Resource name (singular, PascalCase) */
    name: z.string(),
    /**
     * Plural form for collections, in Pascal case, letters only
     * (`RESOURCE_PLURAL_PATTERN`); it determines the resource's segment
     * on every public surface.
     */
    plural: z
      .string()
      .regex(
        RESOURCE_PLURAL_PATTERN,
        'A resource plural must be a Pascal case identifier of letters only, such as "MediaItems" or "URLs"; it spells the resource in every route and permission'
      ),
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
    /**
     * The app's own spelling of the resource's collection, where it differs
     * from the spelling derived from the plural. Absent means the derived
     * spelling is the app's.
     */
    native: ResourceNativeSpellingSchema.optional(),
    /**
     * Set when the app cannot provide the resource (its dictionary has no
     * collection for it, or every read of it fails), with the evidence.
     * Generated surfaces omit a resource marked unsupported.
     */
    unsupported: ResourceUnsupportedSchema.optional(),
  })
  .superRefine((resource, ctx) => {
    checkNativeSpellings(resource, ctx)
    checkUniquenessClaims(resource.identifiers ?? [], ctx)
    // A resource is addressed by its primary identifier, so the identifier
    // must be readable: it cannot be marked unsupported.
    const identifier = resolvePrimaryIdentifierProperty(resource)
    if (identifier === undefined) return
    const property = Object.hasOwn(resource.properties, identifier)
      ? resource.properties[identifier]
      : undefined
    if (property?.unsupported !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `The primary identifier "${identifier}" cannot be marked unsupported: choose a different identifier.`,
        path: ['properties', identifier, 'unsupported'],
      })
    }
  })
export type Resource = z.infer<typeof ResourceSchema>

/**
 * An identifier's uniqueness claim and its evidence come together: a claim
 * with no evidence would page a list on a guess, and evidence with no claim
 * says nothing.
 */
function checkUniquenessClaims(
  identifiers: readonly {
    readonly unique?: boolean | undefined
    readonly evidence?: { readonly unique?: unknown } | undefined
  }[],
  ctx: z.RefinementCtx
): void {
  identifiers.forEach((identifier, index) => {
    const claimed = identifier.unique !== undefined
    const evidenced = identifier.evidence?.unique !== undefined
    if (claimed && !evidenced) {
      ctx.addIssue({
        code: 'custom',
        message:
          "An identifier's unique claim needs evidence.unique saying where it comes from (the dictionary, or a curated observation).",
        path: ['identifiers', index, 'evidence', 'unique'],
      })
    } else if (evidenced && !claimed) {
      ctx.addIssue({
        code: 'custom',
        message: 'evidence.unique supports a claim, so the identifier must also set unique.',
        path: ['identifiers', index, 'unique'],
      })
    }
  })
}

/**
 * A recorded native spelling must differ from the spelling it replaces: a
 * collection's from the one derived from the plural, a property's from its
 * key. A resource marked unsupported is never addressed, so it records no
 * collection spelling.
 */
function checkNativeSpellings(
  resource: {
    readonly plural: string
    readonly properties: Readonly<
      Record<string, { readonly native?: { name: string } | undefined }>
    >
    readonly native?: { readonly collection: string } | undefined
    readonly unsupported?: unknown
  },
  ctx: z.RefinementCtx
): void {
  const collection = resource.native?.collection
  if (collection !== undefined && collection === defaultCollectionAccessor(resource.plural)) {
    ctx.addIssue({
      code: 'custom',
      message: `The native collection "${collection}" is the spelling derived from the plural, so recording it is redundant: remove native.`,
      path: ['native', 'collection'],
    })
  }
  if (resource.native !== undefined && resource.unsupported !== undefined) {
    ctx.addIssue({
      code: 'custom',
      message:
        'A resource marked unsupported is not addressed in the app, so it cannot record a native collection spelling.',
      path: ['native'],
    })
  }
  for (const [key, property] of Object.entries(resource.properties)) {
    if (property.native?.name === key) {
      ctx.addIssue({
        code: 'custom',
        message: `The native name "${key}" is the property's key, so recording it is redundant: remove native.`,
        path: ['properties', key, 'native', 'name'],
      })
    }
  }
}

import { z } from 'zod'
import { PropertyClaimsSchema, PropertySchema } from './property.js'
import {
  checkCuratedAbsence,
  DictionaryTermEvidenceSchema,
  IdentifierUniquenessEvidenceSchema,
  ObservedAtSchema,
  RangeReadEvidenceSchema,
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
 * - `byKey`: the collection's key specifier, applied to the identifier
 *   property's value. The app interprets the key: for a file system it is a
 *   path, which finds whatever item is at that path now. The targeting names
 *   the lookup mechanism; the identifier property says what the value is.
 * - `byRoot`: the application property a singleton root's kind names (see
 *   `../roots.ts`). Only the identifier normalisation gives a root is
 *   `byRoot`; a manifest never writes it.
 */
export const IdentifierTargetingSchema = z.enum(['byId', 'byProperty', 'byKey', 'byRoot'])
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
   * working property instead, and `byKey` when the app finds an item from the
   * identifier's value through its collection's key specifier. Consumers resolve
   * the effective strategy via `resolveIdentifierTargeting`, which applies the
   * `byId` default.
   */
  targeting: IdentifierTargetingSchema.optional(),
  /**
   * The JXA property name to match on when `targeting` is `byProperty`.
   *
   * Optional: when omitted, the runtime layer matches on `property`. Provide it
   * only when the value-carrying property differs from the property the runtime
   * `whose({ ... })` clause must match (it is the same in the common case). It
   * is rejected under `byKey`, whose key is the identifier value itself.
   */
  runtimeProperty: z.string().optional(),
  /**
   * Whether no two items the collection holds at the same time share this
   * identifier's value, as `evidence.unique` shows. Absent means unknown,
   * which is treated as not unique: a list pages only when its resource's
   * primary identifier is claimed unique, and its resource records a
   * supported range read (see `listOperationPages`). The
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
    evidence: DictionaryTermEvidenceSchema,
  })
  .strict()
export type ResourceNativeSpelling = z.infer<typeof ResourceNativeSpellingSchema>

/**
 * One kind of a singleton root: the application property that holds the
 * object of that kind, with the evidence for it.
 *
 * `property` is the app's spelling of the application property, and the
 * evidence is the dictionary term it spells, for one app build on one macOS
 * version.
 */
export const ResourceRootSchema = z
  .object({
    /** The app's spelling of the application property, e.g. `frontDesk`. */
    property: z.string().min(1),
    /** The dictionary term the property is the app's spelling of. */
    evidence: DictionaryTermEvidenceSchema,
  })
  .strict()
export type ResourceRoot = z.infer<typeof ResourceRootSchema>

/**
 * The form of a root kind: lower camel case, letters and digits, so a kind is
 * a valid enum value, CLI argument and permission-free identifier.
 */
const ROOT_KIND_PATTERN = /^[a-z][A-Za-z0-9]*$/

/**
 * The kinds of a singleton root resource: each kind names the application
 * property that holds that kind's one object (an app holding a front desk as
 * `frontDesk` and a back desk as `backDesk`). The objects are in no
 * collection; the resource's identity is the kind (see `../roots.ts`).
 */
export const ResourceRootsSchema = z.record(
  z
    .string()
    .regex(
      ROOT_KIND_PATTERN,
      'A root kind is lower camel case, letters and digits only, such as "front" or "userDomain"'
    ),
  ResourceRootSchema
)
export type ResourceRoots = z.infer<typeof ResourceRootsSchema>

/**
 * The class a resource's dictionary class inherits, recorded from the
 * dictionary's `inherits` attribute, never guessed.
 *
 * The manifest is read flattened (`../superclasses.ts`, phases/13 D10,
 * "Superclasses"): the resource gains each ancestor property it does not
 * declare, and the nearest ancestor's identifiers when it declares none, so
 * every surface sees a subclass's record and identity as its superclass's
 * unless the resource says otherwise. The superclass must be a resource of
 * the same manifest, and the chain must not loop.
 */
export const ResourceInheritsSchema = z
  .object({
    /** The manifest key of the superclass resource, e.g. `DiskItem`. */
    resource: z.string().min(1),
    /** The superclass's name exactly as the dictionary's `inherits` writes it, e.g. `disk item`. */
    evidence: DictionaryTermEvidenceSchema,
  })
  .strict()
export type ResourceInherits = z.infer<typeof ResourceInheritsSchema>

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
 * How a list that pages reads the items of one page, chosen per resource from
 * live measurement.
 *
 * - `range`: each property is read once over the page's items, as a range of
 *   the collection. A page costs what it holds, whatever the collection's
 *   size.
 * - `column`: each property is read once over the whole collection, and the
 *   values are cut to the page inside the automation process. Some apps
 *   answer a range read item by item but a whole-collection read at once
 *   (Contacts people), so this is the faster page there. A page costs what
 *   the whole collection costs, so it grows with the collection.
 *
 * Both give the same page, cursor, anchor check and changed-collection
 * failure; only how the values are fetched differs.
 */
export const PAGE_READS = ['range', 'column'] as const
/** One way a list that pages reads a page (see {@link PAGE_READS}). */
export type PageRead = (typeof PAGE_READS)[number]

/**
 * The page read measured page costs choose: `column` only when the column page
 * took at most three quarters of the range page's time
 * (`columnMs <= 0.75 * pageMs`), and `range` otherwise, ties included.
 *
 * Range is the default because a range page costs what the page holds, so it
 * keeps paging's latency bound whatever the collection's size; a column page
 * costs what the whole collection costs. Column gives up that bound, so it is
 * chosen only for a clear measured gain. The margin absorbs typical
 * measurement noise, so a small difference keeps range; a result near the
 * margin can fall either side when measured again, and the recorded median
 * decides. The comparison is made in whole numbers, so the boundary is exact,
 * and a tie is range even when both reads measured 0 ms.
 */
export function pageReadFor(pageMs: number, columnMs: number): PageRead {
  return columnMs < pageMs && columnMs * 4 <= pageMs * 3 ? 'column' : 'range'
}

/**
 * The marker recording whether the running app reads a range of a resource's
 * collection, by position, in one request, with the live evidence, and how a
 * page of it is read.
 *
 * A list pages only when its resource carries `supported: true` (see
 * `listOperationPages`): paging is enabled only on a live observation of the
 * collection read page by page, since an app that rejects range reads failed
 * every page (Music playlists). `supported: false` records a range read
 * observed to fail, with the error numbers it raised; absent means no
 * observation, and the resource's lists do not page. The marker is curated from a read-only
 * observation of the app: no probe writes or changes it. It covers the
 * collection wherever the resource's lists read it, at the application or
 * under a parent item.
 *
 * A passing marker records `read` (see {@link PAGE_READS}) and the measured
 * page cost (`evidence.cost`, see `PageCostSchema`), and `read` must be the
 * read that cost chooses (see {@link pageReadFor}): `range` unless the column
 * page was clearly faster. The choice holds at the recorded collection size; a
 * column page costs more as the collection grows. A failed marker records no
 * `read` and no cost.
 */
export const ResourceRangeReadSchema = z
  .discriminatedUnion('supported', [
    z
      .object({
        /** The observed range reads succeeded. */
        supported: z.literal(true),
        /** How a page of the collection is read (see {@link PAGE_READS}). */
        read: z.enum(PAGE_READS),
        /** The observation that shows it, with the measured page costs. */
        evidence: RangeReadEvidenceSchema,
      })
      .strict(),
    z
      .object({
        /** The observed range reads failed. */
        supported: z.literal(false),
        /** The observation that shows it. */
        evidence: RangeReadEvidenceSchema,
      })
      .strict(),
  ])
  .superRefine((marker, ctx) => {
    const evidence = marker.evidence
    const failed = evidence.errorNumbers !== undefined
    if (!marker.supported) {
      if (!failed) {
        ctx.addIssue({
          code: 'custom',
          message:
            'A range read observed to fail records the error numbers it raised: set evidence.errorNumbers.',
          path: ['evidence', 'errorNumbers'],
        })
      }
      if (evidence.cost !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'evidence.cost records what a page cost, which a failed range read cannot have.',
          path: ['evidence', 'cost'],
        })
      }
      return
    }
    if (failed) {
      ctx.addIssue({
        code: 'custom',
        message:
          'evidence.errorNumbers records failed range reads, so it cannot support supported: true.',
        path: ['evidence', 'errorNumbers'],
      })
    }
    const cost = evidence.cost
    if (cost === undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          'A list that pages records what a page cost, both ways it can be read, and how it was measured: set evidence.cost.',
        path: ['evidence', 'cost'],
      })
      return
    }
    const { pageMs, columnMs } = cost
    const chosen = pageReadFor(pageMs, columnMs)
    if (marker.read !== chosen) {
      ctx.addIssue({
        code: 'custom',
        message: `read must be the page read the measured costs choose, column only when columnMs is at most 0.75 x pageMs: ${chosen} (pageMs ${String(pageMs)}, columnMs ${String(columnMs)}).`,
        path: ['read'],
      })
    }
  })
export type ResourceRangeRead = z.infer<typeof ResourceRangeReadSchema>

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
     * The superclass of the resource's dictionary class, from the
     * dictionary. Absent means the class inherits nothing the manifest
     * models. The manifest is read flattened, so a parsed resource already
     * holds what it inherits.
     */
    inherits: ResourceInheritsSchema.optional(),
    /**
     * Claims about properties the resource inherits, by property key, stated
     * without redeclaring the property (`PropertyClaimsSchema`). Only a
     * resource that records `inherits` has them, each for a property an
     * ancestor declares and the resource does not. The manifest is read
     * flattened, so a parsed resource holds them merged into its properties.
     */
    inheritedClaims: z.record(z.string(), PropertyClaimsSchema).optional(),
    /**
     * Set when the app cannot provide the resource (its dictionary has no
     * collection for it, or every read of it fails), with the evidence.
     * Generated surfaces omit a resource marked unsupported.
     */
    unsupported: ResourceUnsupportedSchema.optional(),
    /**
     * Whether the running app reads a range of the resource's collection, with
     * the live evidence. Absent means unobserved; the resource's lists page
     * only when it is `supported: true` (see `listOperationPages`).
     */
    rangeRead: ResourceRangeReadSchema.optional(),
    /**
     * Set when the resource is a singleton root: the app holds each of its
     * objects as an application property, one per kind, named here with the
     * evidence. Absent for a resource reached through a collection.
     */
    roots: ResourceRootsSchema.optional(),
  })
  .superRefine((resource, ctx) => {
    checkNativeSpellings(resource, ctx)
    checkRoots(resource, ctx)
    checkKeyTargeting(resource.identifiers ?? [], ctx)
    checkCuratedAbsence(resource, ctx)
    if (resource.rangeRead !== undefined && resource.unsupported !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          'A resource marked unsupported is never read, so it cannot record whether its collection reads a range.',
        path: ['rangeRead'],
      })
    }
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
 * A singleton root's objects are held by the application as properties, not
 * in a collection: it has at least one kind, and records no collection
 * spelling and no range read.
 */
function checkRoots(
  resource: {
    readonly roots?: ResourceRoots | undefined
    readonly native?: unknown
    readonly rangeRead?: unknown
  },
  ctx: z.RefinementCtx
): void {
  const roots = resource.roots
  if (roots === undefined) return
  if (Object.keys(roots).length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'A root names at least one kind and the application property that holds it.',
      path: ['roots'],
    })
  }
  const held = 'A root is held by the application as its properties, not in a collection'
  if (resource.native !== undefined) {
    ctx.addIssue({
      code: 'custom',
      message: `${held}, so it records no collection spelling; remove native.`,
      path: ['native'],
    })
  }
  if (resource.rangeRead !== undefined) {
    ctx.addIssue({
      code: 'custom',
      message: `${held}, so it records no range read; remove rangeRead.`,
      path: ['rangeRead'],
    })
  }
}

/**
 * A key-targeted identifier is looked up by its own value, so it takes no
 * `runtimeProperty`, which names the property a `byProperty` match is made on.
 */
function checkKeyTargeting(
  identifiers: readonly {
    readonly targeting?: IdentifierTargeting | undefined
    readonly runtimeProperty?: string | undefined
  }[],
  ctx: z.RefinementCtx
): void {
  identifiers.forEach((identifier, index) => {
    if (identifier.targeting === 'byKey' && identifier.runtimeProperty !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          'runtimeProperty names the property a byProperty match is made on; byKey looks the item up by the identifier value itself, so remove it.',
        path: ['identifiers', index, 'runtimeProperty'],
      })
    }
  })
}

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

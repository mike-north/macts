/**
 * Evidence for claims a manifest makes about a field's values.
 *
 * A manifest may claim that a field can or cannot hold "no value"
 * (nullability), and that an update can clear a field (resettability). Every
 * such claim must say where it comes from, so a later reader can judge it, and
 * a later observation can tell drift from error. This module defines the
 * evidence records and the consistency rules that tie a claim to its evidence.
 *
 * Absence of a claim means "no evidence", not "no": generators then apply
 * their documented defaults (a read field is nullable, an input is not).
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { VALUE_KINDS } from '../value-kinds.js'

/**
 * The fewest successful reads a probe must make, all of them non-null, before
 * its observation can support a non-null claim.
 *
 * A probe can show that a field is sometimes empty by observing it once; it
 * can never prove that a field is always set. A sample of at least this many
 * items, none empty, is the bar for treating "always set" as established. The
 * manifest schema enforces it on probe evidence, and the probe applies it
 * when merging observations.
 */
export const NON_NULL_SAMPLE_THRESHOLD = 30

/**
 * The native "no such object" error number, as a probe records it: the app
 * reports that an item has no object at a property, which for a property
 * that holds an object (a folder an item may not have) is how the app says
 * the value is absent. Mirrors the native layer's own constant, which this
 * layer cannot import.
 */
export const ABSENT_VALUE_ERROR_NUMBER = -1728

/**
 * When evidence was observed or confirmed: an ISO 8601 UTC timestamp, e.g.
 * `2026-10-31T12:00:00.000Z`. UTC only, so timestamps compare as written.
 */
export const ObservedAtSchema = z.iso.datetime()

/** A count of items or reads: a non-negative integer. */
const CountSchema = z.number().int().nonnegative()

/**
 * Evidence gathered by observing the live app (`macts probe --nullability`).
 *
 * It records presence only: how many reads succeeded, how many found no
 * value, and how many threw. It never records an observed value. The
 * provenance fields say exactly which app build, on which macOS version, the
 * observation holds for, because whether an app leaves a field empty can
 * change between releases.
 */
export const ProbeNullabilityEvidenceSchema = z
  .object({
    source: z.literal('probe'),
    /** When the observation was made: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** The bundle identifier of the observed app. */
    bundleId: z.string().min(1),
    /** The observed app's version. */
    appVersion: z.string().min(1),
    /** The macOS product version the app ran on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /** Items whose read succeeded, whether or not they held a value. */
    sampleSize: CountSchema,
    /** Successful reads that found no value. */
    nullCount: CountSchema,
    /**
     * Reads that threw. A throwing read is not evidence of an empty value, so
     * it counts toward neither `sampleSize` nor `nullCount`.
     */
    failedReads: CountSchema,
    /**
     * The distinct error numbers the failed reads raised, each once, when they
     * were recorded. When they are exactly the absent-value number
     * ({@link ABSENT_VALUE_ERROR_NUMBER}), the failures are the app reporting
     * no value, so they support a nullable claim, and a read that fails that
     * way is taken as the empty value (see {@link readsAbsentAsNull}).
     */
    errorNumbers: z.array(z.number().int()).min(1).optional(),
    /** Why this observation replaced an earlier claim, when it did. */
    note: z.string().min(1).optional(),
  })
  .superRefine((evidence, ctx) => {
    if (evidence.nullCount > evidence.sampleSize) {
      ctx.addIssue({
        code: 'custom',
        message: 'nullCount cannot exceed sampleSize: every empty read is a successful read.',
        path: ['nullCount'],
      })
    }
    const numbers = evidence.errorNumbers
    if (numbers === undefined) return
    if (evidence.failedReads === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'errorNumbers records what failed reads raised, so it needs failedReads above 0.',
        path: ['errorNumbers'],
      })
    }
    if (new Set(numbers).size !== numbers.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'errorNumbers lists each distinct error number once.',
        path: ['errorNumbers'],
      })
    }
  })
export type ProbeNullabilityEvidence = z.infer<typeof ProbeNullabilityEvidenceSchema>

/**
 * Evidence a manifest author supplies: a note naming why the claim holds (an
 * app guarantee, a structural invariant, documentation, or a test).
 */
export const CuratedNullabilityEvidenceSchema = z.object({
  source: z.literal('curated'),
  /** Names the evidence for the claim. */
  note: z.string().min(1),
  /** When the claim was last confirmed (an ISO 8601 UTC timestamp), if recorded. */
  observedAt: ObservedAtSchema.optional(),
  /** The app version the claim was confirmed against, if recorded. */
  appVersion: z.string().min(1).optional(),
})
export type CuratedNullabilityEvidence = z.infer<typeof CuratedNullabilityEvidenceSchema>

/**
 * Evidence from the app's own scripting dictionary, which declares that the
 * field can hold "missing value". It can therefore support only a nullable
 * claim.
 */
export const SdefNullabilityEvidenceSchema = z.object({
  source: z.literal('sdef'),
  /** Where in the dictionary the declaration appears, if recorded. */
  note: z.string().min(1).optional(),
})
export type SdefNullabilityEvidence = z.infer<typeof SdefNullabilityEvidenceSchema>

/** Evidence for a nullability claim, by where it comes from. */
export const NullabilityEvidenceSchema = z.discriminatedUnion('source', [
  ProbeNullabilityEvidenceSchema,
  CuratedNullabilityEvidenceSchema,
  SdefNullabilityEvidenceSchema,
])
export type NullabilityEvidence = z.infer<typeof NullabilityEvidenceSchema>

/**
 * Evidence that an update can reset a field by setting it to `null`.
 *
 * Only curation can supply it: proving a reset works requires writing to the
 * app, which the probe never does. The note names the verification, ideally a
 * locally runnable test, so a later run can reconfirm it.
 */
export const ResettabilityEvidenceSchema = z.object({
  source: z.literal('curated'),
  /** Names the verification that the reset works. */
  note: z.string().min(1),
  /** When the reset was last verified (an ISO 8601 UTC timestamp), if recorded. */
  observedAt: ObservedAtSchema.optional(),
  /** The app version the reset was verified against, if recorded. */
  appVersion: z.string().min(1).optional(),
})
export type ResettabilityEvidence = z.infer<typeof ResettabilityEvidenceSchema>

/**
 * Evidence that a property the app declares cannot be read at runtime: a live,
 * read-only observation in which every read of it failed.
 *
 * Like nullability evidence it records the app build and macOS version it
 * holds for, and counts only, never a value. It adds the distinct error
 * numbers the failed reads raised, which tell a missing implementation from a
 * misnamed property or a permission problem.
 */
export const UnsupportedReadFailureEvidenceSchema = z
  .object({
    source: z.literal('probe'),
    /** When the observation was made: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** The bundle identifier of the observed app. */
    bundleId: z.string().min(1),
    /** The observed app's version. */
    appVersion: z.string().min(1),
    /** The macOS product version the app ran on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /** Items whose read of the property was attempted: at least one. */
    sampleSize: z.number().int().min(1),
    /** Reads that failed: every one, so equal to `sampleSize`. */
    failedReads: CountSchema,
    /** The distinct error numbers the failed reads raised: at least one. */
    errorNumbers: z.array(z.number().int()).min(1),
  })
  .strict()
  .superRefine((evidence, ctx) => {
    if (evidence.failedReads !== evidence.sampleSize) {
      ctx.addIssue({
        code: 'custom',
        message:
          'A property is unsupported only when every read failed: failedReads must equal sampleSize.',
        path: ['failedReads'],
      })
    }
    if (new Set(evidence.errorNumbers).size !== evidence.errorNumbers.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'errorNumbers lists each distinct error number once.',
        path: ['errorNumbers'],
      })
    }
  })
export type UnsupportedReadFailureEvidence = z.infer<typeof UnsupportedReadFailureEvidenceSchema>

/**
 * Evidence that the values of a property the app declares cannot be decoded
 * yet: a live, read-only observation in which the reads succeeded but every
 * value had a kind its declared type does not expect (a property declared
 * `string` whose values are object references, say). Without the marker,
 * every read of the resource would fail to decode.
 *
 * It records the app build and macOS version, and the values counted by kind
 * label (see `../value-kinds.ts`), never a value. That no observed kind is one
 * the declared type expects is checked against the property's type, in
 * `PropertySchema`.
 */
export const UnsupportedKindEvidenceSchema = z
  .object({
    source: z.literal('probe'),
    /** When the observation was made: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** The bundle identifier of the observed app. */
    bundleId: z.string().min(1),
    /** The observed app's version. */
    appVersion: z.string().min(1),
    /** The macOS product version the app ran on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /** Values whose kind was observed: at least one. */
    sampleSize: z.number().int().min(1),
    /**
     * The observed values counted by kind label, e.g. `{ reference: 18 }`:
     * labels from `VALUE_KINDS` only, each count at least one, summing to
     * `sampleSize`.
     */
    observedKinds: z.partialRecord(z.enum(VALUE_KINDS), z.number().int().min(1)),
  })
  .strict()
  .superRefine((evidence, ctx) => {
    const total = Object.values(evidence.observedKinds).reduce<number>(
      (sum, count) => sum + count,
      0
    )
    if (total !== evidence.sampleSize) {
      ctx.addIssue({
        code: 'custom',
        message:
          'The observedKinds counts must sum to sampleSize: every value observed has one kind.',
        path: ['observedKinds'],
      })
    }
  })
export type UnsupportedKindEvidence = z.infer<typeof UnsupportedKindEvidenceSchema>

/**
 * The evidence behind an `unsupported` marker, in one of two forms: every
 * read failed ({@link UnsupportedReadFailureEvidenceSchema}), or every value
 * had a kind the declared type does not expect
 * ({@link UnsupportedKindEvidenceSchema}).
 */
export const UnsupportedEvidenceSchema = z.union([
  UnsupportedReadFailureEvidenceSchema,
  UnsupportedKindEvidenceSchema,
])
export type UnsupportedEvidence = z.infer<typeof UnsupportedEvidenceSchema>

/**
 * The marker on a property the app's dictionary declares but that cannot be
 * used at runtime, as its evidence shows: the app cannot provide it
 * (unimplemented, obsolete, or otherwise unreadable), or it returns values of
 * a kind the generated code cannot decode yet.
 *
 * The manifest keeps such a property, so the record of what the dictionary
 * declares stays complete and the omission stays auditable; every generated
 * surface (the contract, SDKs, tool schemas, the CLI) leaves it out, and the
 * nullability probe does not read it. The marker is curated: no probe writes
 * or changes it. A property marked unsupported carries no nullability or
 * resettability claim, and a resource's primary identifier cannot be marked.
 */
export const UnsupportedSchema = z.object({
  /** Why the property cannot be used, in prose. */
  reason: z.string().min(1),
  /**
   * The dictionary's own availability note for the property, when it has one,
   * e.g. `NOT AVAILABLE YET` or `AVAILABLE IN 10.1 TO 10.4`.
   */
  dictionaryNote: z.string().min(1).optional(),
  /**
   * The issue whose fix will remove the marker, by number, e.g. the issue
   * that adds a conversion for the value kind the app returns.
   */
  trackingIssue: z.number().int().positive().optional(),
  /** The observation that shows the property cannot be used. */
  evidence: UnsupportedEvidenceSchema,
})
export type Unsupported = z.infer<typeof UnsupportedSchema>

/**
 * Evidence from an app's scripting dictionary: a term exactly as the
 * dictionary writes it, for one app build on one macOS version.
 *
 * The term is what the dictionary shows; the provenance fields say which
 * build the dictionary was read from, because a later release can rename a
 * term or change a class. A manifest records it where it states something the
 * dictionary declares and macts cannot derive: an app's own spelling of a
 * collection or a property (`native` in `./resource.ts` and `./property.ts`),
 * or the class a class inherits (`inherits` in `./resource.ts`).
 *
 * For a native spelling the term is the evidence because the bridge's
 * spelling follows from the term itself (its first word lowercased whole,
 * each later word capitalized): "AirPlay devices" is `airplayDevices`, "ANSI
 * black color" is `ansiBlackColor`.
 */
export const DictionaryTermEvidenceSchema = z
  .object({
    source: z.literal('dictionary'),
    /** The bundle identifier of the app whose dictionary was read. */
    bundleId: z.string().min(1),
    /** The version of the app whose dictionary was read. */
    appVersion: z.string().min(1),
    /** The macOS product version the app was installed on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /**
     * The dictionary term exactly as the dictionary writes it, e.g.
     * `AirPlay devices` or `URL`: a class's plural for a collection, a
     * property's name for a property, the superclass's name for a class's
     * `inherits`.
     */
    term: z.string().min(1),
  })
  .strict()
export type DictionaryTermEvidence = z.infer<typeof DictionaryTermEvidenceSchema>

/**
 * How an app's dictionary lacks a collection the manifest declares.
 *
 * - `no-class`: the dictionary declares no class with the resource's code or
 *   name, so the app has no such object at all.
 * - `not-an-element`: the class exists, but no class has it as an element, so
 *   there is no collection of it; the app reaches it some other way (Finder's
 *   desktop is the application's `desktop` property).
 */
export const DictionaryAbsenceFindingSchema = z.enum(['no-class', 'not-an-element'])
export type DictionaryAbsenceFinding = z.infer<typeof DictionaryAbsenceFindingSchema>

/**
 * Evidence that an app's scripting dictionary has no collection for a
 * resource the manifest declares: what was looked for, what the dictionary
 * showed, and which app build on which macOS version it holds for.
 */
export const DictionaryAbsenceEvidenceSchema = z
  .object({
    source: z.literal('dictionary'),
    /** The bundle identifier of the app whose dictionary was read. */
    bundleId: z.string().min(1),
    /** The version of the app whose dictionary was read. */
    appVersion: z.string().min(1),
    /** The macOS product version the app was installed on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /**
     * The term the manifest expected the dictionary to declare, as the
     * dictionary would write it, e.g. `connection` or `desktop-object`.
     */
    term: z.string().min(1),
    /** How the dictionary lacks the collection. */
    finding: DictionaryAbsenceFindingSchema,
  })
  .strict()
export type DictionaryAbsenceEvidence = z.infer<typeof DictionaryAbsenceEvidenceSchema>

/**
 * Evidence that something a manifest declares is absent from the running app:
 * a live, read-only observation in which addressing it failed, for one app
 * build on one macOS version.
 *
 * It records what was addressed, in words, and the error number the app
 * raised, never a value. The error number tells a missing collection
 * (`-1728`, no such object) from an unreadable one (`-1700`, a value that
 * cannot be converted) or a permission problem.
 */
export const LiveAbsenceEvidenceSchema = z
  .object({
    source: z.literal('live'),
    /** When the observation was made: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** The bundle identifier of the observed app. */
    bundleId: z.string().min(1),
    /** The observed app's version. */
    appVersion: z.string().min(1),
    /** The macOS product version the app ran on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /**
     * What was addressed, described in words and never as a value, e.g.
     * `the settings collection at the application`.
     */
    expression: z.string().min(1),
    /** The error number the app raised when it was addressed, e.g. `-1728`. */
    errorNumber: z.number().int(),
  })
  .strict()
export type LiveAbsenceEvidence = z.infer<typeof LiveAbsenceEvidenceSchema>

/**
 * The evidence behind a resource's `unsupported` marker, in one of two forms:
 * the app's dictionary has no collection for it
 * ({@link DictionaryAbsenceEvidenceSchema}), or the running app fails every
 * read of it ({@link LiveAbsenceEvidenceSchema}).
 */
export const ResourceAbsenceEvidenceSchema = z.discriminatedUnion('source', [
  DictionaryAbsenceEvidenceSchema,
  LiveAbsenceEvidenceSchema,
])
export type ResourceAbsenceEvidence = z.infer<typeof ResourceAbsenceEvidenceSchema>

/**
 * Evidence for a claim that an identifier's values are, or are not, unique
 * within its resource's collection: no two items the collection holds at the
 * same time share one value.
 *
 * Uniqueness decides whether a list can page (phases/13 D9, _Bounded list
 * pages_): a page is anchored on the identifier of the item before it, and an
 * identifier two items can share cannot show that the collection shifted by
 * one position. The claim is never inferred, from the identifier's name or
 * from how it is targeted; it is curated, and must say where it comes from:
 *
 * - `sdef`: the app's scripting dictionary describes the property as the
 *   object's unique identifier. The note quotes or names that description.
 * - `curated`: an observation or a structural fact, such as recurring event
 *   occurrences sharing one identifier, or names the user chooses freely.
 */
export const IdentifierUniquenessEvidenceSchema = z
  .object({
    source: z.enum(['sdef', 'curated']),
    /** Names the evidence for the claim. */
    note: z.string().min(1),
    /** When the claim was last confirmed (an ISO 8601 UTC timestamp), if recorded. */
    observedAt: ObservedAtSchema.optional(),
    /** The app version the claim was confirmed against, if recorded. */
    appVersion: z.string().min(1).optional(),
  })
  .strict()
export type IdentifierUniquenessEvidence = z.infer<typeof IdentifierUniquenessEvidenceSchema>

/** A count that is at least one: a page size, a number of runs, a collection size. */
const PositiveCountSchema = z.number().int().min(1)

/**
 * What one page of a resource's collection cost, timed live and read-only
 * through the real list body, both ways a page can be read (see `PAGE_READS`
 * in the resource schema): its own observation, dated by its own
 * `observedAt`, because it is measured apart from the range-read check it
 * belongs to.
 *
 * The first page at `pageSize` items is read `runs` times each way, the two
 * reads interleaved so that load on the machine affects both alike, and each
 * time is the median of its runs. A page read by range costs what the page
 * holds; a page read by column costs what the whole collection costs, so
 * `columnMs` holds only near the recorded `items`. Only timings and a count
 * are recorded, never a value.
 */
export const PageCostSchema = z
  .object({
    /** When the timing was taken: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** Milliseconds the page took read by range: the median of `runs` reads. */
    pageMs: CountSchema,
    /** Milliseconds the same page took read by column: the median of `runs` reads. */
    columnMs: CountSchema,
    /** How many items the collection held when the page was timed. */
    items: PositiveCountSchema,
    /** How many times the page was read each way; each time is the median of these runs. */
    runs: PositiveCountSchema,
    /** How many items the timed page asked for. */
    pageSize: PositiveCountSchema,
  })
  .strict()
export type PageCost = z.infer<typeof PageCostSchema>

/**
 * Evidence for a claim that the running app does, or does not, read a range
 * of a resource's collection: a live, read-only observation of the collection
 * read by position, from a start index to an end index, in one request.
 *
 * A list pages only on positive evidence (phases/13 D9, _Bounded list pages_):
 * a page is read as a range of the collection, and an app whose collection
 * rejects that read fails every page, so paging is never inferred from the
 * dictionary, which does not say whether ranges work. Like the other live
 * evidence it records the app build and macOS version it holds for, and never
 * a value. When the reads failed it lists the distinct error numbers they
 * raised, which tell a request the app does not understand (`-1708`) from a
 * permission problem; when they passed it lists none.
 *
 * When the reads passed it also records what a page cost, as its own
 * observation (`cost`, see {@link PageCostSchema}), since the timing is taken
 * separately from the check that range reads work, and may be taken again
 * without repeating it. The resource's marker chooses its page read from that
 * cost (see `pageReadFor`).
 */
export const RangeReadEvidenceSchema = z
  .object({
    source: z.literal('probe'),
    /** When the observation was made: an ISO 8601 UTC timestamp. */
    observedAt: ObservedAtSchema,
    /** The bundle identifier of the observed app. */
    bundleId: z.string().min(1),
    /** The observed app's version. */
    appVersion: z.string().min(1),
    /** The macOS product version the app ran on, e.g. `27.2`. */
    osVersion: z.string().min(1),
    /**
     * The distinct error numbers the failed range reads raised, each once.
     * Present exactly when the reads failed.
     */
    errorNumbers: z.array(z.number().int()).min(1).optional(),
    /**
     * What a page cost, read both ways a page can be read. Present exactly
     * when the reads passed.
     */
    cost: PageCostSchema.optional(),
    /**
     * What was read, in words and never as a value, e.g. which collection,
     * which page sizes, and whether a following page was read.
     */
    note: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((evidence, ctx) => {
    const numbers = evidence.errorNumbers ?? []
    if (new Set(numbers).size !== numbers.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'errorNumbers lists each distinct error number once.',
        path: ['errorNumbers'],
      })
    }
  })
export type RangeReadEvidence = z.infer<typeof RangeReadEvidenceSchema>

/** The parts of a field that make or support a nullability claim. */
interface NullabilityClaim {
  readonly nullable?: boolean | undefined
  readonly evidence?: { readonly nullable?: NullabilityEvidence | undefined } | undefined
}

/**
 * Check that a field's nullability claim and its evidence agree, reporting
 * each disagreement as an issue on `ctx`.
 *
 * - A claim needs evidence, and evidence needs a claim.
 * - Probe evidence that observed an empty value supports only `nullable: true`,
 *   and probe evidence supports `nullable: true` only when it observed one,
 *   or when its failed reads all reported an absent value
 *   ({@link reportsAbsence}).
 * - Probe evidence supports `nullable: false` only when it observed no empty
 *   value across at least {@link NON_NULL_SAMPLE_THRESHOLD} reads.
 * - Dictionary evidence supports only `nullable: true`.
 */
export function checkNullabilityClaim(claim: NullabilityClaim, ctx: z.RefinementCtx): void {
  const evidence = claim.evidence?.nullable
  if (claim.nullable !== undefined && evidence === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'A nullability claim needs evidence: set evidence.nullable.',
      path: ['evidence', 'nullable'],
    })
    return
  }
  if (claim.nullable === undefined && evidence !== undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'Nullability evidence needs a claim: set nullable.',
      path: ['nullable'],
    })
    return
  }
  if (evidence === undefined) return
  if (evidence.source === 'probe') {
    if (evidence.nullCount > 0 && claim.nullable !== true) {
      ctx.addIssue({
        code: 'custom',
        message: `The probe observed ${String(evidence.nullCount)} empty values, so the field is nullable.`,
        path: ['nullable'],
      })
    }
    if (evidence.nullCount === 0 && claim.nullable === true && !reportsAbsence(evidence)) {
      if (failedReadsAllReportedAbsence(evidence)) {
        // Every read failed with "no value": absence on every instance is
        // structural, so the property is unsupported, not nullable (D10).
        ctx.addIssue({
          code: 'custom',
          message:
            'Every probed read failed, so absence is structural rather than dependent on the data; mark the property unsupported instead of nullable.',
          path: ['evidence', 'nullable', 'sampleSize'],
        })
      } else {
        const cause = evidence.errorNumbers === undefined ? 'nullCount' : 'errorNumbers'
        ctx.addIssue({
          code: 'custom',
          message: `The probe observed no empty value, and its failed reads are not all the app reporting no value (${String(ABSENT_VALUE_ERROR_NUMBER)}), so it cannot show that the field is nullable.`,
          path: ['evidence', 'nullable', cause],
        })
      }
    }
    if (reportsAbsence(evidence) && claim.nullable === false) {
      ctx.addIssue({
        code: 'custom',
        message: `The probe's failed reads reported no value (${String(ABSENT_VALUE_ERROR_NUMBER)}), so the field is nullable.`,
        path: ['nullable'],
      })
    }
    if (
      claim.nullable === false &&
      (evidence.nullCount !== 0 || evidence.sampleSize < NON_NULL_SAMPLE_THRESHOLD)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `A probe supports a non-null claim only with no empty values in at least ${String(NON_NULL_SAMPLE_THRESHOLD)} reads.`,
        path: ['evidence', 'nullable', 'sampleSize'],
      })
    }
  }
  if (evidence.source === 'sdef' && claim.nullable !== true) {
    ctx.addIssue({
      code: 'custom',
      message: 'The scripting dictionary can only declare that a field may be empty.',
      path: ['nullable'],
    })
  }
}

/**
 * Whether some probed reads failed and every failure raised the absent-value
 * number ({@link ABSENT_VALUE_ERROR_NUMBER}), whatever else the probe read.
 */
function failedReadsAllReportedAbsence(evidence: ProbeNullabilityEvidence): boolean {
  return (
    evidence.failedReads > 0 &&
    evidence.errorNumbers?.every((number) => number === ABSENT_VALUE_ERROR_NUMBER) === true
  )
}

/**
 * Whether probe evidence shows the app reporting an absent value by failing
 * the read on some instances only: failed reads all raised the absent-value
 * number ({@link ABSENT_VALUE_ERROR_NUMBER}), and at least one read succeeded
 * (failed reads count toward neither `sampleSize` nor `nullCount`, so
 * `sampleSize` above 0 is a successful read). A property whose every read
 * failed is absent structurally, which phases/13 D10 calls unsupported.
 */
export function reportsAbsence(evidence: ProbeNullabilityEvidence): boolean {
  return evidence.sampleSize > 0 && failedReadsAllReportedAbsence(evidence)
}

/**
 * Whether a read of the field that fails with the absent-value number
 * ({@link ABSENT_VALUE_ERROR_NUMBER}) is the field's empty value: the field
 * is claimed nullable, on probe evidence whose failed reads all reported an
 * absent value ({@link reportsAbsence}). Any other failure of the read is
 * still a failure, and so is this one for any field without that evidence.
 */
export function readsAbsentAsNull(claim: NullabilityClaim): boolean {
  const evidence = claim.evidence?.nullable
  return claim.nullable === true && evidence?.source === 'probe' && reportsAbsence(evidence)
}

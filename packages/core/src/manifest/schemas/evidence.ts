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
    /** Why this observation replaced an earlier claim, when it did. */
    note: z.string().min(1).optional(),
  })
  .refine((evidence) => evidence.nullCount <= evidence.sampleSize, {
    message: 'nullCount cannot exceed sampleSize: every empty read is a successful read.',
    path: ['nullCount'],
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
 *   and probe evidence supports `nullable: true` only when it observed one.
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
    if (evidence.nullCount === 0 && claim.nullable === true) {
      ctx.addIssue({
        code: 'custom',
        message: 'The probe observed no empty value, so it cannot show that the field is nullable.',
        path: ['evidence', 'nullable', 'nullCount'],
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

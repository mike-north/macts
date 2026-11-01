/**
 * What a nullability probe's observations mean for a manifest.
 *
 * This is the single, pure decision of which nullability claims an
 * observation sets, refreshes, or leaves alone. The probe gathers counts
 * (`probeNullability`) and the writer applies the decisions to the manifest
 * file (`writeNullabilityResults`); neither decides anything itself.
 *
 * The rules, per property with at least one successful read:
 *
 * - **Empty values observed.** The property is nullable: the observation is
 *   recorded as probe evidence. It replaces any non-null claim, from any
 *   source (an observation outranks a claim), and that replacement is
 *   reported as a contradiction. A nullable claim from an earlier probe is
 *   refreshed; a curated or dictionary nullable claim already agrees and is
 *   kept, with its provenance.
 * - **No empty value in at least `NON_NULL_SAMPLE_THRESHOLD` reads.** The
 *   property is recorded as non-null, but only where there is no claim yet or
 *   the claim is an earlier probe's non-null claim, which is refreshed. A
 *   sample never narrows a nullable claim (narrowing is curation's job) and
 *   never overrides a curated claim.
 * - **Fewer clean reads than the threshold, or no successful read.** Nothing
 *   changes.
 *
 * The primary identifier property is never given a claim: it is non-null by
 * structure. In a resource whose items were read, an identifier that was
 * empty or failed to read in any item, or that was not read at all, is a
 * manifest defect (the identifier choice is wrong), reported per resource
 * with its counts.
 *
 * Resettability is never touched: only curation can establish it.
 *
 * @packageDocumentation
 */

import { resolvePrimaryIdentifierProperty } from '../manifest/identifier.js'
import {
  NON_NULL_SAMPLE_THRESHOLD,
  type NullabilityEvidence,
  type ProbeNullabilityEvidence,
} from '../manifest/schemas/evidence.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { NullabilityProbe } from '../manifest/schemas/resource.js'
import type {
  AppNullabilityResult,
  PropertyPresence,
  ResourceNullabilityResult,
} from './nullability.js'

/**
 * What the counts for one property show, independent of any claim:
 *
 * - `nullable`: at least one successful read found no value.
 * - `non-null`: no empty value in at least `NON_NULL_SAMPLE_THRESHOLD` reads.
 * - `insufficient-sample`: no empty value, but too few reads to say more.
 * - `read-failed`: no read succeeded, and at least one threw.
 * - `not-read`: no read was attempted, because the resource yielded no items
 *   (it was empty, unreachable, failed, or out of time).
 */
export type PropertyObservation =
  | 'nullable'
  | 'non-null'
  | 'insufficient-sample'
  | 'read-failed'
  | 'not-read'

/**
 * What the merge does to a property's claim:
 *
 * - `set`: writes a new probe claim (there was none, or it replaces a
 *   contradicted non-null claim).
 * - `refreshed`: replaces an earlier probe claim with the same verdict.
 * - `unchanged`: leaves the manifest as it is.
 */
export type ClaimChange = 'set' | 'refreshed' | 'unchanged'

/** The merge's decision for one property. */
export interface PropertyMergeOutcome {
  readonly property: string
  readonly presence: PropertyPresence
  readonly observation: PropertyObservation
  readonly change: ClaimChange
  /** The claim to write, when `change` is not `unchanged`. */
  readonly claim?: { readonly nullable: boolean; readonly evidence: ProbeNullabilityEvidence }
  /**
   * The non-null claim the observation contradicted and replaced, by its
   * evidence source.
   */
  readonly contradicted?: NullabilityEvidence['source']
}

/**
 * A manifest defect: the resource's primary identifier property was not
 * present in every item the probe read. Counts only, never a value.
 */
export interface IdentifierDefect {
  /** The primary identifier property. */
  readonly property: string
  /** How many items were read. */
  readonly itemsRead: number
  /** Items whose identifier read succeeded but found no value. */
  readonly empty: number
  /** Items whose identifier read threw. */
  readonly failed: number
  /**
   * Whether the identifier was read at all. It is always read when the
   * resource declares it as a property, so `false` means the identifier
   * names a property the resource does not declare.
   */
  readonly probed: boolean
}

/** The merge's decisions for one resource. */
export interface ResourceMergeOutcome {
  readonly resource: string
  /** The resource's `nullabilityProbe` block to write. */
  readonly block: NullabilityProbe
  /** One outcome per property the probe read. */
  readonly properties: readonly PropertyMergeOutcome[]
  /** Set when the primary identifier was not present in every item read. */
  readonly identifierDefect?: IdentifierDefect
}

/** The merge's decisions for one app, ready for the writer and the CLI. */
export interface NullabilityMergeResult {
  readonly bundleId: string
  readonly appName: string
  readonly resources: readonly ResourceMergeOutcome[]
}

/** Classify one property's counts. */
export function classifyPresence(presence: PropertyPresence): PropertyObservation {
  if (presence.reads === 0) return presence.failures > 0 ? 'read-failed' : 'not-read'
  if (presence.nulls > 0) return 'nullable'
  return presence.reads >= NON_NULL_SAMPLE_THRESHOLD ? 'non-null' : 'insufficient-sample'
}

/** The manifest's current nullability claim on a property, if it has one. */
interface ExistingClaim {
  readonly nullable: boolean
  readonly evidence: NullabilityEvidence
}

function existingClaim(
  manifest: AppManifest,
  resourceKey: string,
  property: string
): ExistingClaim | undefined {
  const definition = manifest.resources[resourceKey]?.properties[property]
  const evidence = definition?.evidence?.nullable
  if (definition?.nullable === undefined || evidence === undefined) return undefined
  return { nullable: definition.nullable, evidence }
}

/** Decide one (non-identifier) property's outcome. */
function decideProperty(
  property: string,
  presence: PropertyPresence,
  existing: ExistingClaim | undefined,
  provenance: Omit<ProbeNullabilityEvidence, 'sampleSize' | 'nullCount' | 'failedReads' | 'note'>
): PropertyMergeOutcome {
  const observation = classifyPresence(presence)
  const evidence = (note?: string): ProbeNullabilityEvidence => ({
    ...provenance,
    sampleSize: presence.reads,
    nullCount: presence.nulls,
    failedReads: presence.failures,
    ...(note === undefined ? {} : { note }),
  })
  const unchanged: PropertyMergeOutcome = { property, presence, observation, change: 'unchanged' }

  if (observation === 'nullable') {
    if (existing === undefined) {
      return { ...unchanged, change: 'set', claim: { nullable: true, evidence: evidence() } }
    }
    if (!existing.nullable) {
      const source = existing.evidence.source
      return {
        ...unchanged,
        change: 'set',
        claim: { nullable: true, evidence: evidence(`replaced ${source} non-null claim`) },
        contradicted: source,
      }
    }
    return existing.evidence.source === 'probe'
      ? { ...unchanged, change: 'refreshed', claim: { nullable: true, evidence: evidence() } }
      : unchanged
  }
  if (observation === 'non-null') {
    if (existing === undefined) {
      return { ...unchanged, change: 'set', claim: { nullable: false, evidence: evidence() } }
    }
    return existing.evidence.source === 'probe' && !existing.nullable
      ? { ...unchanged, change: 'refreshed', claim: { nullable: false, evidence: evidence() } }
      : unchanged
  }
  return unchanged
}

/** The note on the block of a resource the time budget left unread. */
const BUDGET_SPENT_NOTE = 'not probed: the time budget was spent'

/**
 * The value-free note on a resource's probe block: why the call failed, that
 * the time budget left the resource unread, or that the time limit cut a
 * sample of at least one item short (which explains a sample below
 * `NON_NULL_SAMPLE_THRESHOLD`).
 */
function probeBlockNote(result: ResourceNullabilityResult): string | undefined {
  if (result.note !== undefined) return result.note
  if (result.status === 'budget') return BUDGET_SPENT_NOTE
  if (result.status !== 'probed' || !result.truncated || result.itemsRead === 0) return undefined
  const items = result.itemsRead === 1 ? 'item' : 'items'
  return `stopped at the time limit after ${String(result.itemsRead)} ${items}`
}

/**
 * The identifier defect a resource's observations show, if any. Only a
 * resource whose items were read can show one: an identifier that was empty
 * or threw in any item, or was not read at all.
 */
function identifierDefect(
  identifier: string | undefined,
  result: ResourceNullabilityResult
): IdentifierDefect | undefined {
  if (identifier === undefined || result.itemsRead === 0) return undefined
  const presence = result.presence[identifier]
  if (presence === undefined) {
    return { property: identifier, itemsRead: result.itemsRead, empty: 0, failed: 0, probed: false }
  }
  if (presence.nulls === 0 && presence.failures === 0) return undefined
  return {
    property: identifier,
    itemsRead: result.itemsRead,
    empty: presence.nulls,
    failed: presence.failures,
    probed: true,
  }
}

/** The `nullabilityProbe` block recording how a resource was probed. */
function probeBlock(
  app: AppNullabilityResult,
  result: ResourceNullabilityResult
): NullabilityProbe {
  const note = probeBlockNote(result)
  return {
    observedAt: app.observedAt,
    bundleId: app.bundleId,
    appVersion: app.appVersion,
    osVersion: app.osVersion,
    accessPath: result.accessPath,
    itemsRead: result.itemsRead,
    sampledParents: result.sampledParents,
    status: result.status,
    skipped: result.skipped.map((entry) => entry.property),
    ...(note === undefined ? {} : { note }),
  }
}

/**
 * Decide what a nullability probe's observations mean for the manifest it
 * probed. Pure: it reads the manifest and the observations, and returns the
 * decisions.
 *
 * @param manifest - The manifest as it was when probed.
 * @param observed - What the probe observed.
 */
export function mergeNullabilityObservations(
  manifest: AppManifest,
  observed: AppNullabilityResult
): NullabilityMergeResult {
  const provenance = {
    source: 'probe' as const,
    observedAt: observed.observedAt,
    bundleId: observed.bundleId,
    appVersion: observed.appVersion,
    osVersion: observed.osVersion,
  }
  const resources = Object.values(observed.resources).flatMap((result): ResourceMergeOutcome[] => {
    const resource = manifest.resources[result.resource]
    if (resource === undefined) return []
    const identifier = resolvePrimaryIdentifierProperty(resource)
    const properties = Object.entries(result.presence).map(([property, presence]) => {
      if (property === identifier) {
        return {
          property,
          presence,
          observation: classifyPresence(presence),
          change: 'unchanged' as const,
        }
      }
      return decideProperty(
        property,
        presence,
        existingClaim(manifest, result.resource, property),
        provenance
      )
    })
    const defect = identifierDefect(identifier, result)
    return [
      {
        resource: result.resource,
        block: probeBlock(observed, result),
        properties,
        ...(defect === undefined ? {} : { identifierDefect: defect }),
      },
    ]
  })
  return { bundleId: observed.bundleId, appName: observed.appName, resources }
}

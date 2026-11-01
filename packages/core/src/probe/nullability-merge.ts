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
 * In a resource whose items were read, a property whose every read failed
 * (no successful read, and one failure per item read) is also a manifest
 * defect: the property most likely does not exist under that name in the
 * app. It gets no claim, like any property without a successful read. The
 * primary identifier is the exception: an identifier whose every read failed
 * is reported once, as the identifier defect, which already carries its
 * counts and asks for a different identifier.
 *
 * A property the manifest marks `unsupported` (one the app cannot provide)
 * is never given a claim, since a marked property carries none, and is not
 * reported as a defect, since the marker already records that it cannot be
 * read. The probe does not read such a property; this holds as well for
 * observations of one, say from a run before the marker was added. Neither
 * the merge nor the writer ever adds, changes, or removes the marker: it is
 * curated.
 *
 * Each read property's value kinds are compared with the kinds its declared
 * type expects (see `../manifest/value-kinds.ts`). Values of a kind the type does not
 * expect are a manifest defect, reported with the counts of matching and
 * contradicting values; a declared type with no expected kinds is reported
 * as unchecked. Neither changes a claim.
 *
 * Resettability is never touched: only curation can establish it.
 *
 * @packageDocumentation
 */

import { resolvePrimaryIdentifierProperty } from '../manifest/identifier.js'
import { isUnsupportedProperty } from '../manifest/unsupported.js'
import {
  NON_NULL_SAMPLE_THRESHOLD,
  type NullabilityEvidence,
  type ProbeNullabilityEvidence,
} from '../manifest/schemas/evidence.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { NullabilityProbe, Resource } from '../manifest/schemas/resource.js'
import type {
  AppNullabilityResult,
  PropertyPresence,
  ResourceNullabilityResult,
} from './nullability.js'
import { createNameResolver, type NameResolver } from '../generator/contract/value-mapping.js'
import {
  VALUE_KINDS,
  describeDeclaredType,
  possibleValueKinds,
  type ValueKind,
  type ValueKindCounts,
} from '../manifest/value-kinds.js'
import { expectedValueKindsIn } from './value-kinds.js'

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

/**
 * A manifest defect: every read of a (non-identifier) property failed, in a
 * resource whose items were read. A property that always fails is most likely
 * misnamed in the manifest, unsupported by the app, or obsolete. Counts only,
 * never a value.
 */
export interface ReadFailureDefect {
  /** The property whose every read failed. */
  readonly property: string
  /** How many items were read; every one of them failed to read the property. */
  readonly itemsRead: number
  /** How many reads failed: equal to `itemsRead`. */
  readonly failed: number
}

/**
 * A manifest defect: the kinds of a property's values contradict its declared
 * type (a property declared `string` whose values are dates, say), so every
 * generated decoder of it fails. Reported when at least one value has a kind
 * the declared type does not expect; a mix reports both counts. Labels and
 * counts only, never a value.
 */
export interface KindMismatchDefect {
  /** The property. */
  readonly property: string
  /** The declared type, as reports show it, e.g. `string` or `list of date`. */
  readonly declared: string
  /** The kinds the declared type expects (see `expectedValueKinds`). */
  readonly expected: readonly ValueKind[]
  /** How many values were found: the reads that found one. */
  readonly values: number
  /** How many of them had an expected kind. */
  readonly matched: number
  /** The values of an unexpected kind, counted by kind. */
  readonly unexpected: ValueKindCounts
  /**
   * Whether these counts are valid kind evidence for an `unsupported` marker:
   * no value matched, and no observed kind is one the declared type could
   * expect under any resolution of its type names (`possibleValueKinds`).
   * The probe only reports this; it never writes a marker.
   */
  readonly markable: boolean
}

/**
 * A property whose value kinds were not compared with its declared type,
 * because the type has no expected kinds (`any`, files, or a type that names
 * no resource or enum).
 */
export interface UncheckedKinds {
  /** The property. */
  readonly property: string
  /** The declared type, as reports show it. */
  readonly declared: string
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
  /**
   * The properties whose every read failed, in probe order. Set only when
   * there is at least one. Never includes the primary identifier, which
   * `identifierDefect` reports instead.
   */
  readonly readFailureDefects?: readonly ReadFailureDefect[]
  /**
   * Properties whose value kinds contradict their declared type: manifest
   * defects. Absent when there are none.
   */
  readonly kindDefects?: readonly KindMismatchDefect[]
  /**
   * Properties read whose declared type has no expected kinds, so their kinds
   * were not checked. Absent when there are none.
   */
  readonly kindsUnchecked?: readonly UncheckedKinds[]
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
 * The note on a nested resource whose parent scan ran out of time before it
 * found an item, or `undefined` for any other result. Such a resource was
 * probed, not skipped, and whether it has items is unknown: only the parents
 * counted here were looked in. A top-level resource, or one the budget left
 * unread (no parent looked in), gets no such note.
 *
 * It keys on the `budget` status, which a call that looked in parents gets
 * when the time ran out before any item was read. That is the pre-scan's
 * deadline, which falls at `PARENT_SCAN_TIME_SHARE` of the call's time
 * limit, so the sample always has the rest: only a single app round trip
 * longer than that share could instead spend the sample's time first.
 *
 * Shared by the manifest's probe block and the CLI's report, so the two say
 * the same thing.
 *
 * @param result - The resource's status, access path, and parents scanned.
 *
 * @public
 */
export function scanExhaustedNote(
  result: Pick<ResourceNullabilityResult, 'status' | 'accessPath' | 'parentsScanned'>
): string | undefined {
  if (result.status !== 'budget' || !result.accessPath.includes('/')) return undefined
  if (result.parentsScanned === 0) return undefined
  const parents = result.parentsScanned === 1 ? 'parent' : 'parents'
  return `no items found in the ${String(result.parentsScanned)} ${parents} scanned before the time limit`
}

/**
 * The value-free note on a resource's probe block: why the call failed, that
 * a nested resource's parent scan ran out of time before any item (see
 * {@link scanExhaustedNote}), that the time budget left the resource unread,
 * or that the time limit cut a sample of at least one item short (which
 * explains a sample below `NON_NULL_SAMPLE_THRESHOLD`).
 */
function probeBlockNote(result: ResourceNullabilityResult): string | undefined {
  const cut = sampleCutText(result)
  // A note from the probe (a parent scan the time cut short) keeps the
  // sample's own cut, when both happened.
  if (result.note !== undefined) {
    return cut === undefined ? result.note : `${result.note}; the sample ${cut}`
  }
  if (result.status === 'budget') return scanExhaustedNote(result) ?? BUDGET_SPENT_NOTE
  return cut
}

/** `stopped at the time limit after N items`, for a sample of at least one item the time cut short. */
function sampleCutText(result: ResourceNullabilityResult): string | undefined {
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

/**
 * The properties whose every read failed in a resource whose items were read:
 * no successful read, and as many failures as items (`reads == 0 &&
 * failures == itemsRead > 0`). The primary identifier is left to
 * {@link identifierDefect}, so it is reported once.
 */
function readFailureDefects(
  identifier: string | undefined,
  marked: ReadonlySet<string>,
  result: ResourceNullabilityResult
): ReadFailureDefect[] {
  if (result.itemsRead === 0) return []
  return Object.entries(result.presence).flatMap(([property, presence]): ReadFailureDefect[] =>
    property !== identifier &&
    !marked.has(property) &&
    presence.reads === 0 &&
    presence.failures === result.itemsRead
      ? [{ property, itemsRead: result.itemsRead, failed: presence.failures }]
      : []
  )
}

/**
 * The comparison of each read property's value kinds with its declared type:
 * the properties whose kinds contradict it, and those whose type has no
 * expected kinds. The primary identifier is checked like any other property;
 * a property marked unsupported, or not declared, is not.
 */
function kindFindings(
  resource: Resource,
  marked: ReadonlySet<string>,
  result: ResourceNullabilityResult,
  names: NameResolver
): { defects: KindMismatchDefect[]; unchecked: UncheckedKinds[] } {
  const defects: KindMismatchDefect[] = []
  const unchecked: UncheckedKinds[] = []
  for (const [property, presence] of Object.entries(result.presence)) {
    if (marked.has(property) || !Object.hasOwn(resource.properties, property)) continue
    const type = resource.properties[property]?.type
    const declared = describeDeclaredType(type)
    const expected = expectedValueKindsIn(type, names)
    if (expected === undefined) {
      unchecked.push({ property, declared })
      continue
    }
    const kinds = presence.kinds ?? {}
    let matched = 0
    const unexpected: Partial<Record<ValueKind, number>> = {}
    for (const kind of VALUE_KINDS) {
      const count = kinds[kind] ?? 0
      if (count === 0) continue
      if (expected.includes(kind)) matched += count
      else unexpected[kind] = count
    }
    if (Object.keys(unexpected).length > 0) {
      const values = presence.reads - presence.nulls
      const possible = possibleValueKinds(type) ?? []
      const markable =
        matched === 0 &&
        VALUE_KINDS.every((kind) => !(kind in unexpected) || !possible.includes(kind))
      defects.push({ property, declared, expected, values, matched, unexpected, markable })
    }
  }
  return { defects, unchecked }
}

/** The properties a resource marks unsupported. */
function unsupportedNames(resource: Resource): Set<string> {
  return new Set(
    Object.entries(resource.properties)
      .filter(([, definition]) => isUnsupportedProperty(definition))
      .map(([name]) => name)
  )
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
    parentsScanned: result.parentsScanned,
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
  const names = createNameResolver(manifest)
  const resources = Object.values(observed.resources).flatMap((result): ResourceMergeOutcome[] => {
    const resource = manifest.resources[result.resource]
    if (resource === undefined) return []
    const identifier = resolvePrimaryIdentifierProperty(resource)
    const marked = unsupportedNames(resource)
    const properties = Object.entries(result.presence).map(([property, presence]) => {
      if (property === identifier || marked.has(property)) {
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
    const readFailures = readFailureDefects(identifier, marked, result)
    const kinds = kindFindings(resource, marked, result, names)
    return [
      {
        resource: result.resource,
        block: probeBlock(observed, result),
        properties,
        ...(defect === undefined ? {} : { identifierDefect: defect }),
        ...(readFailures.length === 0 ? {} : { readFailureDefects: readFailures }),
        ...(kinds.defects.length === 0 ? {} : { kindDefects: kinds.defects }),
        ...(kinds.unchecked.length === 0 ? {} : { kindsUnchecked: kinds.unchecked }),
      },
    ]
  })
  return { bundleId: observed.bundleId, appName: observed.appName, resources }
}

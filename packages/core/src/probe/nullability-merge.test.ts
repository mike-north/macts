/**
 * Tests for merging nullability probe observations into manifest claims.
 *
 * Each case is one merge rule, with its expected decision derived by hand:
 *
 * - Empty values observed: nullable, with probe evidence; replaces a non-null
 *   claim from any source (reported as a contradiction, with a note); refreshes
 *   an earlier probe's nullable claim; keeps a curated or dictionary nullable
 *   claim.
 * - No empty value in at least NON_NULL_SAMPLE_THRESHOLD reads: non-null with
 *   probe evidence only where there is no claim, or an earlier probe's
 *   non-null claim (refreshed). Never narrows a nullable claim, never
 *   overrides a curated one.
 * - Below the threshold, or no successful read: unchanged.
 * - The primary identifier: never given a claim; in a resource whose items
 *   were read, one empty, failed, or unread in any item is a defect.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; per-field evidence)
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { NullabilityEvidence } from '../manifest/schemas/evidence.js'
import type { Property } from '../manifest/schemas/property.js'
import type { AppNullabilityResult, PropertyPresence } from './nullability.js'
import {
  classifyPresence,
  mergeNullabilityObservations,
  type PropertyMergeOutcome,
} from './nullability-merge.js'

const OBSERVED_AT = '2026-10-31T12:00:00.000Z'
const PROVENANCE = {
  source: 'probe',
  observedAt: OBSERVED_AT,
  bundleId: 'com.example.jotter',
  appVersion: '2.1',
  osVersion: '27.2',
} as const

const EARLIER_PROBE_NULLS: NullabilityEvidence = {
  ...PROVENANCE,
  observedAt: '2026-01-01T00:00:00.000Z',
  appVersion: '2.0',
  sampleSize: 40,
  nullCount: 2,
  failedReads: 0,
}
const EARLIER_PROBE_CLEAN: NullabilityEvidence = { ...EARLIER_PROBE_NULLS, nullCount: 0 }
const CURATED: NullabilityEvidence = { source: 'curated', note: 'The app requires it' }
const SDEF: NullabilityEvidence = { source: 'sdef' }

const NULLS: PropertyPresence = { reads: 40, nulls: 3, failures: 1 }
const CLEAN: PropertyPresence = { reads: 30, nulls: 0, failures: 2 }
const SMALL: PropertyPresence = { reads: 29, nulls: 0, failures: 0 }
const FAILED: PropertyPresence = { reads: 0, nulls: 0, failures: 5 }
const NOT_READ: PropertyPresence = { reads: 0, nulls: 0, failures: 0 }
const NULLS_FREE_40: PropertyPresence = { reads: 40, nulls: 0, failures: 0 }

type Claim = Pick<Property, 'nullable' | 'evidence'>

/** A one-resource manifest whose `field` property carries `claim`. */
function manifestWith(claim: Claim = {}): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Jotter', bundleId: 'com.example.jotter', tccEntitlements: [] },
    resources: {
      Note: {
        name: 'Note',
        plural: 'Notes',
        description: 'A note',
        identifiers: [{ property: 'uid', primary: true }],
        properties: {
          uid: { access: 'r', type: 'string', description: 'Id', optional: false },
          field: {
            access: 'rw',
            type: 'string',
            description: 'A field',
            optional: false,
            ...claim,
          },
        },
      },
    },
    enums: {},
    hierarchy: { children: {} },
    suites: [],
    relationships: [],
    commands: {},
  }
}

function observed(presence: Record<string, PropertyPresence>): AppNullabilityResult {
  return {
    bundleId: 'com.example.jotter',
    appName: 'Jotter',
    appVersion: '2.1',
    osVersion: '27.2',
    observedAt: OBSERVED_AT,
    resources: {
      Note: {
        resource: 'Note',
        accessPath: 'notes',
        status: 'probed',
        itemsRead: 40,
        sampledParents: 1,
        truncated: false,
        presence,
        skipped: [{ property: 'body', reason: 'heavy' }],
      },
    },
  }
}

/** The merge's outcome for `field`, observed as `presence` over a manifest with `claim`. */
function outcome(presence: PropertyPresence, claim: Claim = {}): PropertyMergeOutcome {
  const merged = mergeNullabilityObservations(manifestWith(claim), observed({ field: presence }))
  const found = merged.resources[0]?.properties.find((entry) => entry.property === 'field')
  if (found === undefined) throw new Error('no outcome for field')
  return found
}

/** Probe evidence for `presence`, as the merge must write it. */
function evidenceFor(presence: PropertyPresence, note?: string): NullabilityEvidence {
  return {
    ...PROVENANCE,
    sampleSize: presence.reads,
    nullCount: presence.nulls,
    failedReads: presence.failures,
    ...(note === undefined ? {} : { note }),
  }
}

describe('classifyPresence', () => {
  it('distinguishes nullable, non-null, a small sample, and failed reads', () => {
    expect(classifyPresence(NULLS)).toBe('nullable')
    expect(classifyPresence(CLEAN)).toBe('non-null')
    expect(classifyPresence(SMALL)).toBe('insufficient-sample')
    expect(classifyPresence(FAILED)).toBe('read-failed')
  })

  // Regression: a property of a resource that yielded no items was classified
  // as read-failed, with no read having thrown.
  it('distinguishes a property never read from one whose reads threw', () => {
    expect(classifyPresence(NOT_READ)).toBe('not-read')
    expect(classifyPresence({ reads: 0, nulls: 0, failures: 1 })).toBe('read-failed')
  })
})

describe('mergeNullabilityObservations: empty values observed', () => {
  it('sets nullable with probe evidence where there is no claim', () => {
    expect(outcome(NULLS)).toEqual({
      property: 'field',
      presence: NULLS,
      observation: 'nullable',
      change: 'set',
      claim: { nullable: true, evidence: evidenceFor(NULLS) },
    })
  })

  it('replaces a non-null claim from any source, and reports the contradiction', () => {
    for (const evidence of [CURATED, EARLIER_PROBE_CLEAN]) {
      expect(outcome(NULLS, { nullable: false, evidence: { nullable: evidence } })).toEqual({
        property: 'field',
        presence: NULLS,
        observation: 'nullable',
        change: 'set',
        claim: {
          nullable: true,
          evidence: evidenceFor(NULLS, `replaced ${evidence.source} non-null claim`),
        },
        contradicted: evidence.source,
      })
    }
  })

  it("refreshes an earlier probe's nullable claim with the new counts", () => {
    expect(outcome(NULLS, { nullable: true, evidence: { nullable: EARLIER_PROBE_NULLS } })).toEqual(
      {
        property: 'field',
        presence: NULLS,
        observation: 'nullable',
        change: 'refreshed',
        claim: { nullable: true, evidence: evidenceFor(NULLS) },
      }
    )
  })

  it('keeps a curated or dictionary nullable claim, which already agrees', () => {
    for (const evidence of [CURATED, SDEF]) {
      expect(outcome(NULLS, { nullable: true, evidence: { nullable: evidence } })).toEqual({
        property: 'field',
        presence: NULLS,
        observation: 'nullable',
        change: 'unchanged',
      })
    }
  })
})

describe('mergeNullabilityObservations: a clean sample at the threshold', () => {
  it('sets non-null with probe evidence where there is no claim', () => {
    expect(outcome(CLEAN)).toEqual({
      property: 'field',
      presence: CLEAN,
      observation: 'non-null',
      change: 'set',
      claim: { nullable: false, evidence: evidenceFor(CLEAN) },
    })
  })

  it("refreshes an earlier probe's non-null claim", () => {
    expect(
      outcome(CLEAN, { nullable: false, evidence: { nullable: EARLIER_PROBE_CLEAN } })
    ).toEqual({
      property: 'field',
      presence: CLEAN,
      observation: 'non-null',
      change: 'refreshed',
      claim: { nullable: false, evidence: evidenceFor(CLEAN) },
    })
  })

  it('never narrows a nullable claim from any source, including an earlier probe', () => {
    for (const evidence of [EARLIER_PROBE_NULLS, CURATED, SDEF]) {
      expect(outcome(CLEAN, { nullable: true, evidence: { nullable: evidence } }).change).toBe(
        'unchanged'
      )
    }
  })

  it('never overrides a curated non-null claim', () => {
    expect(outcome(CLEAN, { nullable: false, evidence: { nullable: CURATED } })).toEqual({
      property: 'field',
      presence: CLEAN,
      observation: 'non-null',
      change: 'unchanged',
    })
  })
})

describe('mergeNullabilityObservations: never a probe nullable claim with no nulls', () => {
  // The schema rejects nullable: true on probe evidence with nullCount 0. A
  // later clean or small sample over an earlier probe's nullable claim is the
  // "never narrow" case: the earlier claim, with its nulls, stays as it was.
  it('leaves an earlier probe nullable claim untouched when the new sample has no nulls', () => {
    for (const presence of [CLEAN, SMALL, NULLS_FREE_40, FAILED]) {
      const result = outcome(presence, {
        nullable: true,
        evidence: { nullable: EARLIER_PROBE_NULLS },
      })
      expect(result.change).toBe('unchanged')
      expect(result.claim).toBeUndefined()
    }
  })

  it('writes nullable: true only with the nulls it observed', () => {
    for (const claim of [{}, { nullable: true, evidence: { nullable: EARLIER_PROBE_NULLS } }]) {
      const written = outcome(NULLS, claim).claim
      expect(written?.nullable).toBe(true)
      expect(written?.evidence.nullCount).toBe(3)
    }
  })
})

describe('mergeNullabilityObservations: too little to go on', () => {
  it('changes nothing below the threshold', () => {
    expect(outcome(SMALL)).toEqual({
      property: 'field',
      presence: SMALL,
      observation: 'insufficient-sample',
      change: 'unchanged',
    })
  })

  it('changes nothing, even a non-null claim, when every read failed', () => {
    expect(outcome(FAILED, { nullable: false, evidence: { nullable: CURATED } })).toEqual({
      property: 'field',
      presence: FAILED,
      observation: 'read-failed',
      change: 'unchanged',
    })
  })
})

describe('mergeNullabilityObservations: the primary identifier', () => {
  /** The merge of observations of `uid` alone, over `itemsRead` items. */
  function mergeIdentifier(presence: PropertyPresence | undefined, itemsRead = 40) {
    const result = observed(presence === undefined ? { field: CLEAN } : { uid: presence })
    const note = result.resources['Note'] ?? never()
    return mergeNullabilityObservations(manifestWith(), {
      ...result,
      resources: { Note: { ...note, itemsRead } },
    }).resources[0]
  }

  it('reports an identifier empty in one item as a defect, and writes no claim for it', () => {
    const presence = { reads: 40, nulls: 1, failures: 0 }
    const merged = mergeIdentifier(presence)
    expect(merged?.identifierDefect).toEqual({
      property: 'uid',
      itemsRead: 40,
      empty: 1,
      failed: 0,
      probed: true,
    })
    expect(merged?.properties).toEqual([
      { property: 'uid', presence, observation: 'nullable', change: 'unchanged' },
    ])
  })

  it('reports an identifier whose read threw in one item as a defect', () => {
    const presence = { reads: 39, nulls: 0, failures: 1 }
    const merged = mergeIdentifier(presence)
    expect(merged?.identifierDefect).toEqual({
      property: 'uid',
      itemsRead: 40,
      empty: 0,
      failed: 1,
      probed: true,
    })
    // 39 clean reads would make any other property non-null; the identifier gets no claim.
    expect(merged?.properties).toEqual([
      { property: 'uid', presence, observation: 'non-null', change: 'unchanged' },
    ])
  })

  it('reports an identifier the probe did not read as a defect', () => {
    expect(mergeIdentifier(undefined)?.identifierDefect).toEqual({
      property: 'uid',
      itemsRead: 40,
      empty: 0,
      failed: 0,
      probed: false,
    })
  })

  it('reports no defect, and writes no claim, for an identifier present in every item', () => {
    const merged = mergeIdentifier(NULLS_FREE_40)
    expect(merged?.identifierDefect).toBeUndefined()
    expect(merged?.properties).toEqual([
      { property: 'uid', presence: NULLS_FREE_40, observation: 'non-null', change: 'unchanged' },
    ])
  })

  it('reports no defect for a resource that yielded no items', () => {
    expect(mergeIdentifier(NOT_READ, 0)?.identifierDefect).toBeUndefined()
    expect(mergeIdentifier(undefined, 0)?.identifierDefect).toBeUndefined()
  })
})

describe('mergeNullabilityObservations: the probe block', () => {
  it('records how each resource was probed, naming skipped properties only', () => {
    const merged = mergeNullabilityObservations(manifestWith(), observed({ uid: NULLS_FREE_40 }))
    expect(merged).toEqual({
      bundleId: 'com.example.jotter',
      appName: 'Jotter',
      resources: [
        {
          resource: 'Note',
          block: {
            observedAt: OBSERVED_AT,
            bundleId: 'com.example.jotter',
            appVersion: '2.1',
            osVersion: '27.2',
            accessPath: 'notes',
            itemsRead: 40,
            sampledParents: 1,
            status: 'probed',
            skipped: ['body'],
          },
          properties: [
            {
              property: 'uid',
              presence: NULLS_FREE_40,
              observation: 'non-null',
              change: 'unchanged',
            },
          ],
        },
      ],
    })
  })

  it('notes on the block that the time limit cut the sample short', () => {
    const result = observed({})
    const note = result.resources['Note'] ?? never()
    for (const [itemsRead, text] of [
      [12, 'stopped at the time limit after 12 items'],
      [1, 'stopped at the time limit after 1 item'],
    ] as const) {
      const cut: AppNullabilityResult = {
        ...result,
        resources: { Note: { ...note, itemsRead, truncated: true } },
      }
      const block = mergeNullabilityObservations(manifestWith(), cut).resources[0]?.block
      expect(block).toMatchObject({ status: 'probed', itemsRead, note: text })
    }
  })

  // Regression: a resource the budget left unread was noted as "stopped at the
  // time limit after 0 items".
  it('notes a resource the time budget left unread, before or during its call', () => {
    const result = observed({})
    const note = result.resources['Note'] ?? never()
    for (const truncated of [false, true]) {
      const unread: AppNullabilityResult = {
        ...result,
        resources: {
          Note: { ...note, status: 'budget', itemsRead: 0, sampledParents: 0, truncated },
        },
      }
      expect(mergeNullabilityObservations(manifestWith(), unread).resources[0]?.block).toEqual({
        observedAt: OBSERVED_AT,
        bundleId: 'com.example.jotter',
        appVersion: '2.1',
        osVersion: '27.2',
        accessPath: 'notes',
        itemsRead: 0,
        sampledParents: 0,
        status: 'budget',
        skipped: ['body'],
        note: 'not probed: the time budget was spent',
      })
    }
  })

  it("carries a failed call's value-free note onto the block", () => {
    const result = observed({})
    const note = result.resources['Note'] ?? never()
    const failed: AppNullabilityResult = {
      ...result,
      resources: {
        Note: {
          ...note,
          status: 'error',
          itemsRead: 0,
          note: 'The probe of this resource failed.',
        },
      },
    }
    expect(mergeNullabilityObservations(manifestWith(), failed).resources[0]?.block).toMatchObject({
      status: 'error',
      note: 'The probe of this resource failed.',
    })
  })

  it('ignores observations of a resource the manifest no longer has', () => {
    const result = observed({ field: NULLS })
    const renamed: AppNullabilityResult = {
      ...result,
      resources: { Gone: { ...(result.resources['Note'] ?? never()), resource: 'Gone' } },
    }
    expect(mergeNullabilityObservations(manifestWith(), renamed).resources).toEqual([])
  })
})

function never(): never {
  throw new Error('unreachable')
}

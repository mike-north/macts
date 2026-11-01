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
 * - A property whose every read failed, in a resource whose items were read
 *   (`reads == 0 && failures == itemsRead > 0`): a defect, with no claim. An
 *   identifier that always fails is reported once, as the identifier defect.
 * - Value kinds that contradict the declared type (see value-kinds.ts): a
 *   defect with the matching and contradicting counts, and no claim; a
 *   declared type with no expected kinds is reported as unchecked.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; per-field evidence)
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../manifest/loader.js'
import { PropertySchema } from '../manifest/schemas/property.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { NullabilityEvidence } from '../manifest/schemas/evidence.js'
import type { Property } from '../manifest/schemas/property.js'
import type { AppNullabilityResult, PropertyPresence } from './nullability.js'
import {
  classifyPresence,
  mergeNullabilityObservations,
  scanExhaustedNote,
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

type Claim = Pick<Property, 'nullable' | 'evidence' | 'unsupported'>

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
        parentsScanned: 1,
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

describe('mergeNullabilityObservations: a property whose every read failed', () => {
  /** The merge of `presence` observations over `itemsRead` items of Note. */
  function mergeRead(presence: Record<string, PropertyPresence>, itemsRead = 40) {
    const result = observed(presence)
    const note = result.resources['Note'] ?? never()
    return mergeNullabilityObservations(manifestWith(), {
      ...result,
      resources: { Note: { ...note, itemsRead } },
    }).resources[0]
  }

  const ALWAYS_FAILS: PropertyPresence = { reads: 0, nulls: 0, failures: 40 }

  it('reports it as a defect with its counts, and writes no claim for it', () => {
    const merged = mergeRead({ uid: NULLS_FREE_40, field: ALWAYS_FAILS })
    expect(merged?.readFailureDefects).toEqual([{ property: 'field', itemsRead: 40, failed: 40 }])
    expect(merged?.identifierDefect).toBeUndefined()
    expect(merged?.properties.find((entry) => entry.property === 'field')).toEqual({
      property: 'field',
      presence: ALWAYS_FAILS,
      observation: 'read-failed',
      change: 'unchanged',
    })
  })

  it('reports nothing for a property that failed on some items but not all', () => {
    const merged = mergeRead({ uid: NULLS_FREE_40, field: { reads: 1, nulls: 0, failures: 39 } })
    expect(merged?.readFailureDefects).toBeUndefined()
  })

  it('reports nothing for a resource that yielded no items', () => {
    const merged = mergeRead({ uid: NOT_READ, field: NOT_READ }, 0)
    expect(merged?.readFailureDefects).toBeUndefined()
    expect(merged?.identifierDefect).toBeUndefined()
  })

  it('reports an identifier whose every read failed once, as the identifier defect', () => {
    const merged = mergeRead({ uid: ALWAYS_FAILS, field: NULLS_FREE_40 })
    expect(merged?.identifierDefect).toEqual({
      property: 'uid',
      itemsRead: 40,
      empty: 0,
      failed: 40,
      probed: true,
    })
    expect(merged?.readFailureDefects).toBeUndefined()
  })
})

describe('mergeNullabilityObservations: a property marked unsupported', () => {
  const MARKED: Claim = {
    unsupported: {
      reason: 'The app does not implement this property.',
      evidence: {
        source: 'probe',
        observedAt: OBSERVED_AT,
        bundleId: 'com.example.jotter',
        appVersion: '2.1',
        osVersion: '27.2',
        sampleSize: 40,
        failedReads: 40,
        errorNumbers: [-1728],
      },
    },
  }

  it('gives it no claim, even when observed with empty values or a clean sample', () => {
    // The probe skips a marked property; observations of one (from a run
    // before the marker was added, say) still never claim on it.
    for (const presence of [NULLS, CLEAN, NULLS_FREE_40]) {
      expect(outcome(presence, MARKED)).toEqual({
        property: 'field',
        presence,
        observation: classifyPresence(presence),
        change: 'unchanged',
      })
    }
  })

  it('does not report it as a defect when every read failed: the marker records that', () => {
    const merged = mergeNullabilityObservations(
      manifestWith(MARKED),
      observed({ uid: NULLS_FREE_40, field: { reads: 0, nulls: 0, failures: 40 } })
    ).resources[0]
    expect(merged?.readFailureDefects).toBeUndefined()
  })
})

describe('mergeNullabilityObservations: value kinds against the declared type', () => {
  const KINDS_MANIFEST = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: uid
        primary: true
    properties:
      uid: { access: r, type: string, description: Id }
      created: { access: r, type: string, description: Declared text }
      size: { access: r, type: integer, description: A number }
      priority: { access: r, type: { enum: Priority }, description: An enum }
      color: { access: r, type: rgb, description: A color }
      mood: { access: r, type: any, description: Untyped }
      locked:
        access: r
        type: boolean
        description: Marked
        unsupported:
          reason: Not implemented.
          evidence:
            source: probe
            observedAt: '2026-10-30T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 25
            failedReads: 25
            errorNumbers: [-1728]
enums:
  Priority:
    name: Priority
    description: How urgent
    values:
      - { name: low, value: low }
hierarchy: { children: {} }
commands: {}
`)

  /** The merge of 25 items of Note whose properties were observed as `presence`. */
  function mergeKinds(presence: Record<string, PropertyPresence>) {
    const result = observed(presence)
    const note = result.resources['Note'] ?? never()
    return mergeNullabilityObservations(KINDS_MANIFEST, {
      ...result,
      resources: { Note: { ...note, itemsRead: 25 } },
    }).resources[0]
  }

  const STRINGS: PropertyPresence = { reads: 25, nulls: 0, failures: 0, kinds: { string: 25 } }

  it('reports a declared string whose every value is a date, with its counts', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      created: { reads: 25, nulls: 0, failures: 0, kinds: { date: 25 } },
    })
    expect(merged?.kindDefects).toEqual([
      {
        property: 'created',
        declared: 'string',
        expected: ['string'],
        values: 25,
        matched: 0,
        unexpected: { date: 25 },
        // No value matched: these counts are valid kind evidence for a marker.
        markable: true,
      },
    ])
  })

  it('changes no claim itself: the nullability decision is the same as without the defect', () => {
    const created: PropertyPresence = { reads: 25, nulls: 2, failures: 0, kinds: { date: 23 } }
    const merged = mergeKinds({ uid: STRINGS, created })
    expect(merged?.kindDefects?.map((d) => d.property)).toEqual(['created'])
    // Empty values seen: nullable, exactly as for a property of matching kind.
    const asText = mergeKinds({ uid: STRINGS, created: { ...created, kinds: { string: 23 } } })
    const outcome = (m: typeof merged) => m?.properties.find((p) => p.property === 'created')
    expect(outcome(merged)).toEqual({ ...outcome(asText), presence: created })
    expect(outcome(merged)?.change).toBe('set')
  })

  it('reports nothing when every kind matches, enums and colors included', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      created: STRINGS,
      size: { reads: 25, nulls: 5, failures: 0, kinds: { number: 20 } },
      // An enum value is read as its name.
      priority: STRINGS,
      // A color decodes from a list of channels or a keyed record.
      color: { reads: 25, nulls: 0, failures: 0, kinds: { list: 20, record: 5 } },
    })
    expect(merged?.kindDefects).toBeUndefined()
  })

  it('reports a mix with both counts', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      size: { reads: 25, nulls: 0, failures: 0, kinds: { number: 20, string: 4, other: 1 } },
    })
    expect(merged?.kindDefects).toEqual([
      {
        property: 'size',
        declared: 'integer',
        expected: ['number'],
        values: 25,
        matched: 20,
        unexpected: { string: 4, other: 1 },
        // Some values matched: not evidence that the property cannot be decoded.
        markable: false,
      },
    ])
  })

  it('calls counts markable only when they make a marker the manifest schema accepts', () => {
    const property = KINDS_MANIFEST.resources['Note']?.properties['created'] ?? never()
    const merged = mergeKinds({
      uid: STRINGS,
      created: { reads: 25, nulls: 0, failures: 0, kinds: { reference: 25 } },
    })
    const defect = merged?.kindDefects?.[0] ?? never()
    expect(defect.markable).toBe(true)
    const marked = PropertySchema.safeParse({
      ...property,
      unsupported: {
        reason: 'Values are object references.',
        evidence: {
          source: 'probe',
          observedAt: OBSERVED_AT,
          bundleId: 'com.example.jotter',
          appVersion: '2.1',
          osVersion: '27.2',
          sampleSize: defect.values,
          observedKinds: defect.unexpected,
        },
      },
    })
    expect(marked.success).toBe(true)
  })

  it('does not call counts markable that a named type could expect', () => {
    // An enum is read as a string, but without the manifest's names the
    // marker's schema takes a named type as possibly a reference too, so
    // reference counts would not be valid kind evidence for it.
    const merged = mergeKinds({
      uid: STRINGS,
      priority: { reads: 25, nulls: 0, failures: 0, kinds: { reference: 25 } },
    })
    expect(merged?.kindDefects).toEqual([
      {
        property: 'priority',
        declared: 'Priority',
        expected: ['string'],
        values: 25,
        matched: 0,
        unexpected: { reference: 25 },
        markable: false,
      },
    ])
  })

  it('reports nothing for a property whose every read found no value, or failed', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      created: { reads: 25, nulls: 25, failures: 0 },
      size: { reads: 0, nulls: 0, failures: 25 },
    })
    expect(merged?.kindDefects).toBeUndefined()
  })

  it('checks the primary identifier like any other property', () => {
    const merged = mergeKinds({
      uid: { reads: 25, nulls: 0, failures: 0, kinds: { number: 25 } },
    })
    expect(merged?.kindDefects?.map((d) => d.property)).toEqual(['uid'])
  })

  it('reports a declared type with no expected kinds as unchecked, not as a defect', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      mood: { reads: 25, nulls: 0, failures: 0, kinds: { date: 25 } },
    })
    expect(merged?.kindsUnchecked).toEqual([{ property: 'mood', declared: 'any' }])
    expect(merged?.kindDefects).toBeUndefined()
  })

  it('leaves out a property marked unsupported', () => {
    const merged = mergeKinds({
      uid: STRINGS,
      locked: { reads: 25, nulls: 0, failures: 0, kinds: { string: 25 } },
    })
    expect(merged?.kindDefects).toBeUndefined()
    expect(merged?.kindsUnchecked).toBeUndefined()
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
            parentsScanned: 1,
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
          Note: {
            ...note,
            status: 'budget',
            itemsRead: 0,
            sampledParents: 0,
            parentsScanned: 0,
            truncated,
          },
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
        parentsScanned: 0,
        status: 'budget',
        skipped: ['body'],
        note: 'not probed: the time budget was spent',
      })
    }
  })

  // Regression: a nested resource whose parent scan ran out of time before it
  // found an item was noted as 'not probed', though it ran.
  it('notes how many parents a nested scan looked in when the time ran out before any item', () => {
    const result = observed({})
    const note = result.resources['Note'] ?? never()
    const cases = [
      // Nested and scanned: the parents looked in.
      [
        'calendars/events/mailAlarms',
        151,
        'no items found in the 151 parents scanned before the time limit',
      ],
      [
        'calendars/events/mailAlarms',
        1,
        'no items found in the 1 parent scanned before the time limit',
      ],
      // Nested, but no parent looked in: the budget left it unread.
      ['calendars/events/mailAlarms', 0, 'not probed: the time budget was spent'],
      // Top level: the one parent (the app) is always looked in, so the count says nothing.
      ['notes', 1, 'not probed: the time budget was spent'],
    ] as const
    for (const [accessPath, parentsScanned, text] of cases) {
      const scanned: AppNullabilityResult = {
        ...result,
        resources: {
          Note: {
            ...note,
            accessPath,
            status: 'budget',
            itemsRead: 0,
            sampledParents: 0,
            parentsScanned,
            truncated: true,
          },
        },
      }
      expect(
        mergeNullabilityObservations(manifestWith(), scanned).resources[0]?.block
      ).toMatchObject({
        accessPath,
        status: 'budget',
        parentsScanned,
        note: text,
      })
    }
  })

  it('has no scan-exhausted note for a resource that read items or found none', () => {
    for (const status of ['probed', 'no-items', 'unreachable', 'error'] as const) {
      expect(
        scanExhaustedNote({ status, accessPath: 'calendars/events', parentsScanned: 12 })
      ).toBeUndefined()
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

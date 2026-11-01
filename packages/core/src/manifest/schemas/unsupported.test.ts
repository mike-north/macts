/**
 * Tests for the `unsupported` marker on a manifest property: a property the
 * app's dictionary declares but the app cannot provide at runtime, kept in the
 * manifest with the evidence for the omission.
 *
 * Expected outcomes are derived by hand from the marker's rules: the reason is
 * non-empty prose and the dictionary note, when present, is non-empty; the
 * evidence is a probe observation with full provenance in which every read
 * failed (`failedReads` equals a `sampleSize` of at least one) and that lists
 * at least one error number, each once; a marked property carries no nullable
 * or resettable claim; and a resource's primary identifier cannot be marked.
 *
 * The second evidence form is kind evidence: values were read, counted by
 * kind label, the counts summing to `sampleSize`, and none of a kind the
 * declared type expects (a declared `string` returning references). The
 * marker may name a tracking issue: a positive integer.
 *
 * @see ../value-kinds.ts
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../loader.js'
import {
  UnsupportedEvidenceSchema,
  UnsupportedKindEvidenceSchema,
  UnsupportedReadFailureEvidenceSchema,
  UnsupportedSchema,
  type UnsupportedKindEvidence,
  type UnsupportedReadFailureEvidence,
} from './evidence.js'
import { PropertySchema } from './property.js'
import { ResourceSchema } from './resource.js'

const BASE = { access: 'r', type: 'string', description: 'A field' } as const

function evidence(
  overrides: Partial<UnsupportedReadFailureEvidence> = {}
): UnsupportedReadFailureEvidence {
  return {
    source: 'probe',
    observedAt: '2026-11-01T06:05:32.244Z',
    bundleId: 'com.example.jotter',
    appVersion: '2.1',
    osVersion: '27.2',
    sampleSize: 40,
    failedReads: 40,
    errorNumbers: [-1728],
    ...overrides,
  }
}

/** Kind evidence: 18 values, every one an object reference. */
function kindEvidence(overrides: Partial<UnsupportedKindEvidence> = {}): UnsupportedKindEvidence {
  return {
    source: 'probe',
    observedAt: '2026-11-01T06:05:32.244Z',
    bundleId: 'com.apple.finder',
    appVersion: '27.2',
    osVersion: '27.2',
    sampleSize: 18,
    observedKinds: { reference: 18 },
    ...overrides,
  }
}

function marker(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { reason: 'The app does not implement this property.', evidence: evidence(), ...overrides }
}

/** The issue paths a failed parse reports, or `[]` when it succeeds. */
function issuePaths(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}): PropertyKey[][] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.path) ?? [])
}

describe('the unsupported marker', () => {
  it('accepts a reason and evidence in which every read failed', () => {
    const parsed = PropertySchema.parse({ ...BASE, unsupported: marker() })
    expect(parsed.unsupported).toEqual({
      reason: 'The app does not implement this property.',
      evidence: evidence(),
    })
  })

  it("keeps the dictionary's availability note", () => {
    const parsed = PropertySchema.parse({
      ...BASE,
      unsupported: marker({ dictionaryNote: 'NOT AVAILABLE YET' }),
    })
    expect(parsed.unsupported?.dictionaryNote).toBe('NOT AVAILABLE YET')
  })

  it('accepts a sample of one item, and several distinct error numbers', () => {
    expect(
      UnsupportedReadFailureEvidenceSchema.safeParse(
        evidence({ sampleSize: 1, failedReads: 1, errorNumbers: [-1728, -10000] })
      ).success
    ).toBe(true)
  })

  it('leaves a property unmarked by default', () => {
    expect(PropertySchema.parse(BASE).unsupported).toBeUndefined()
  })

  it('rejects an empty reason and an empty dictionary note', () => {
    expect(issuePaths(UnsupportedSchema.safeParse(marker({ reason: '' })))).toEqual([['reason']])
    expect(issuePaths(UnsupportedSchema.safeParse(marker({ dictionaryNote: '' })))).toEqual([
      ['dictionaryNote'],
    ])
  })

  it('rejects a marker without evidence', () => {
    expect(issuePaths(UnsupportedSchema.safeParse({ reason: 'Unimplemented.' }))).toEqual([
      ['evidence'],
    ])
  })

  it('rejects a partial failure: some reads succeeded', () => {
    expect(
      issuePaths(
        UnsupportedReadFailureEvidenceSchema.safeParse(
          evidence({ sampleSize: 40, failedReads: 39 })
        )
      )
    ).toEqual([['failedReads']])
  })

  it('rejects more failed reads than items sampled', () => {
    expect(
      issuePaths(
        UnsupportedReadFailureEvidenceSchema.safeParse(
          evidence({ sampleSize: 40, failedReads: 41 })
        )
      )
    ).toEqual([['failedReads']])
  })

  it('rejects an empty sample', () => {
    const paths = issuePaths(
      UnsupportedReadFailureEvidenceSchema.safeParse(evidence({ sampleSize: 0, failedReads: 0 }))
    )
    expect(paths).toContainEqual(['sampleSize'])
  })

  it('rejects evidence with no error number, or one listed twice', () => {
    expect(
      issuePaths(UnsupportedReadFailureEvidenceSchema.safeParse(evidence({ errorNumbers: [] })))
    ).toEqual([['errorNumbers']])
    expect(
      issuePaths(
        UnsupportedReadFailureEvidenceSchema.safeParse(evidence({ errorNumbers: [-1728, -1728] }))
      )
    ).toEqual([['errorNumbers']])
  })

  it('rejects a non-integer error number', () => {
    expect(
      issuePaths(
        UnsupportedReadFailureEvidenceSchema.safeParse(evidence({ errorNumbers: [-1728.5] }))
      )
    ).toEqual([['errorNumbers', 0]])
  })

  it('rejects evidence that is not a probe observation, or lacks provenance', () => {
    expect(
      UnsupportedReadFailureEvidenceSchema.safeParse({ ...evidence(), source: 'dictionary' })
        .success
    ).toBe(false)
    const { bundleId: _bundleId, ...noBundle } = evidence()
    expect(issuePaths(UnsupportedReadFailureEvidenceSchema.safeParse(noBundle))).toEqual([
      ['bundleId'],
    ])
  })

  it('rejects a timestamp that is not ISO 8601 UTC', () => {
    expect(
      UnsupportedReadFailureEvidenceSchema.safeParse(
        evidence({ observedAt: '2026-11-01T08:05:32+02:00' })
      ).success
    ).toBe(false)
  })

  it('rejects a marked property that also claims to be nullable or resettable', () => {
    const nullable = PropertySchema.safeParse({
      ...BASE,
      nullable: true,
      evidence: { nullable: { source: 'curated', note: 'May be missing.' } },
      unsupported: marker(),
    })
    expect(issuePaths(nullable)).toContainEqual(['unsupported'])

    const resettable = PropertySchema.safeParse({
      ...BASE,
      access: 'rw',
      resettable: true,
      evidence: { resettable: { source: 'curated', note: 'Setting null clears it.' } },
      unsupported: marker(),
    })
    expect(issuePaths(resettable)).toContainEqual(['unsupported'])
  })
})

describe('the unsupported marker with kind evidence', () => {
  it('accepts a declared string whose every value was a reference, with a tracking issue', () => {
    const parsed = PropertySchema.parse({
      ...BASE,
      unsupported: marker({
        reason: 'Values are object references, which the generated code cannot decode yet.',
        trackingIssue: 155,
        evidence: kindEvidence(),
      }),
    })
    expect(parsed.unsupported).toEqual({
      reason: 'Values are object references, which the generated code cannot decode yet.',
      trackingIssue: 155,
      evidence: kindEvidence(),
    })
  })

  it('accepts several unexpected kinds that sum to the sample', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      type: 'integer',
      unsupported: marker({
        evidence: kindEvidence({ sampleSize: 5, observedKinds: { reference: 3, other: 2 } }),
      }),
    })
    expect(issuePaths(result)).toEqual([])
  })

  it('rejects counts that do not sum to the sample', () => {
    expect(
      issuePaths(
        UnsupportedKindEvidenceSchema.safeParse(
          kindEvidence({ sampleSize: 18, observedKinds: { reference: 17 } })
        )
      )
    ).toEqual([['observedKinds']])
  })

  it('rejects an unknown label, a zero count, and a fractional count', () => {
    for (const observedKinds of [{ text: 18 }, { reference: 18, date: 0 }, { reference: 17.5 }]) {
      const paths = issuePaths(
        UnsupportedKindEvidenceSchema.safeParse({ ...kindEvidence(), observedKinds })
      )
      expect(paths.some((path) => path[0] === 'observedKinds')).toBe(true)
    }
  })

  it('rejects an empty sample', () => {
    const paths = issuePaths(
      UnsupportedKindEvidenceSchema.safeParse(kindEvidence({ sampleSize: 0, observedKinds: {} }))
    )
    expect(paths).toContainEqual(['sampleSize'])
  })

  it('rejects a kind the declared type expects', () => {
    // A declared string that returned strings: those values decode.
    const strings = PropertySchema.safeParse({
      ...BASE,
      unsupported: marker({
        evidence: kindEvidence({ sampleSize: 18, observedKinds: { reference: 17, string: 1 } }),
      }),
    })
    expect(issuePaths(strings)).toEqual([['unsupported', 'evidence', 'observedKinds', 'string']])
    // A declared resource reference expects references.
    const references = PropertySchema.safeParse({
      ...BASE,
      type: { resource: 'Folder' },
      unsupported: marker({ evidence: kindEvidence() }),
    })
    expect(issuePaths(references)).toEqual([
      ['unsupported', 'evidence', 'observedKinds', 'reference'],
    ])
  })

  it('rejects kind evidence on a declared type that is not checked', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      type: 'any',
      unsupported: marker({ evidence: kindEvidence() }),
    })
    expect(issuePaths(result)).toEqual([['unsupported', 'evidence', 'observedKinds']])
  })

  it('rejects evidence that mixes the two forms', () => {
    const mixed = { ...kindEvidence(), failedReads: 18, errorNumbers: [-1728] }
    expect(UnsupportedKindEvidenceSchema.safeParse(mixed).success).toBe(false)
  })

  // Regression: read-failure evidence was not strict, so it silently took
  // kind counts, or a tracking issue that belongs on the marker, and dropped them.
  it('rejects read-failure evidence that also carries observedKinds or trackingIssue', () => {
    for (const extra of [{ observedKinds: { reference: 40 } }, { trackingIssue: 155 }]) {
      const carrying = { ...evidence(), ...extra }
      expect(UnsupportedReadFailureEvidenceSchema.safeParse(carrying).success).toBe(false)
      expect(UnsupportedEvidenceSchema.safeParse(carrying).success).toBe(false)
      expect(
        PropertySchema.safeParse({ ...BASE, unsupported: marker({ evidence: carrying }) }).success
      ).toBe(false)
    }
  })

  it('takes either form as the marker evidence', () => {
    expect(UnsupportedEvidenceSchema.safeParse(evidence()).success).toBe(true)
    expect(UnsupportedEvidenceSchema.safeParse(kindEvidence()).success).toBe(true)
    expect(UnsupportedEvidenceSchema.safeParse({ ...evidence(), failedReads: 39 }).success).toBe(
      false
    )
    const { observedKinds: _kinds, ...neither } = kindEvidence()
    expect(UnsupportedEvidenceSchema.safeParse(neither).success).toBe(false)
  })
})

describe('the unsupported marker: tracking issue', () => {
  it('accepts a positive issue number, and leaves it absent by default', () => {
    expect(UnsupportedSchema.parse(marker({ trackingIssue: 1 })).trackingIssue).toBe(1)
    expect(UnsupportedSchema.parse(marker()).trackingIssue).toBeUndefined()
  })

  it('rejects zero, a negative number, a fraction, and text', () => {
    for (const trackingIssue of [0, -155, 15.5, '#155', '155']) {
      expect(issuePaths(UnsupportedSchema.safeParse(marker({ trackingIssue })))).toEqual([
        ['trackingIssue'],
      ])
    }
  })
})

describe('the unsupported marker on a resource', () => {
  const RESOURCE = {
    name: 'Note',
    plural: 'Notes',
    description: 'A note',
    identifiers: [{ property: 'uid', primary: true }],
  }

  it('accepts a marked property that is not the primary identifier', () => {
    const parsed = ResourceSchema.parse({
      ...RESOURCE,
      properties: { uid: BASE, locked: { ...BASE, unsupported: marker() } },
    })
    expect(parsed.properties['locked']?.unsupported?.evidence).toEqual(evidence())
  })

  it('rejects a marked primary identifier', () => {
    const result = ResourceSchema.safeParse({
      ...RESOURCE,
      properties: { uid: { ...BASE, unsupported: marker() } },
    })
    expect(issuePaths(result)).toEqual([['properties', 'uid', 'unsupported']])
  })

  it('rejects a marked identifier chosen as primary by default (the first declared)', () => {
    const result = ResourceSchema.safeParse({
      ...RESOURCE,
      identifiers: [{ property: 'uid' }, { property: 'name' }],
      properties: { uid: { ...BASE, unsupported: marker() }, name: BASE },
    })
    expect(issuePaths(result)).toEqual([['properties', 'uid', 'unsupported']])
  })

  it('accepts a marked property on a resource with no identifier', () => {
    const { identifiers: _identifiers, ...noIdentifiers } = RESOURCE
    expect(
      ResourceSchema.safeParse({
        ...noIdentifiers,
        properties: { id: { ...BASE, unsupported: marker() } },
      }).success
    ).toBe(true)
  })
})

describe('loading a manifest with an unsupported property', () => {
  it('keeps the marker and its evidence, in either form', () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      name:
        access: r
        type: string
        description: The note's name
      locked:
        access: r
        type: boolean
        description: Whether the note is locked
        unsupported:
          reason: The app does not implement this property.
          dictionaryNote: NOT AVAILABLE YET
          evidence:
            source: probe
            observedAt: '2026-11-01T06:05:32.244Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            failedReads: 40
            errorNumbers: [-1728]
      container:
        access: r
        type: string
        description: The containing folder
        unsupported:
          reason: Values are object references, which the generated code cannot decode yet.
          trackingIssue: 155
          evidence:
            source: probe
            observedAt: '2026-11-01T06:05:32.244Z'
            bundleId: com.apple.finder
            appVersion: '27.2'
            osVersion: '27.2'
            sampleSize: 18
            observedKinds: { reference: 18 }
enums: {}
hierarchy:
  children: {}
commands: {}
`)
    expect(manifest.resources['Note']?.properties['locked']?.unsupported).toEqual({
      reason: 'The app does not implement this property.',
      dictionaryNote: 'NOT AVAILABLE YET',
      evidence: evidence(),
    })
    expect(manifest.resources['Note']?.properties['container']?.unsupported).toEqual({
      reason: 'Values are object references, which the generated code cannot decode yet.',
      trackingIssue: 155,
      evidence: kindEvidence(),
    })
  })
})

/**
 * Tests for nullability and resettability claims on manifest fields, and the
 * evidence each claim must carry.
 *
 * Expected outcomes are derived by hand from the rules: every claim carries
 * evidence and every piece of evidence backs a claim; probe evidence that saw
 * an empty value supports only a nullable claim, and a probe supports a
 * nullable claim only when it saw one; a probe supports a non-null
 * claim only with no empty value in at least NON_NULL_SAMPLE_THRESHOLD reads;
 * dictionary evidence supports only a nullable claim; and a resettable claim
 * needs a curated note. Failed probe reads that all raised -1728 (the app
 * reporting no object at the property) also support a nullable claim, and
 * only that evidence makes such a failed read the field's empty value.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (presence, nullability, and updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; evidence-based defaults)
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../loader.js'
import { CommandParameterSchema } from './command.js'
import {
  NON_NULL_SAMPLE_THRESHOLD,
  NullabilityEvidenceSchema,
  readsAbsentAsNull,
  type ProbeNullabilityEvidence,
} from './evidence.js'
import { PropertySchema } from './property.js'
import { ResourceSchema } from './resource.js'

const BASE = { access: 'r', type: 'string', description: 'A field' } as const

function probe(overrides: Partial<ProbeNullabilityEvidence> = {}): ProbeNullabilityEvidence {
  return {
    source: 'probe',
    observedAt: '2026-10-31T12:00:00.000Z',
    bundleId: 'com.example.jotter',
    appVersion: '2.1',
    osVersion: '27.2',
    sampleSize: 40,
    nullCount: 0,
    failedReads: 0,
    ...overrides,
  }
}

/** A resource reached through a collection: it may have many instances. */
const COLLECTION = {}

/** The issue paths a failed parse reports, or `[]` when it succeeds. */
function issuePaths(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}): PropertyKey[][] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.path) ?? [])
}

describe('NON_NULL_SAMPLE_THRESHOLD', () => {
  it('is 30 reads', () => {
    expect(NON_NULL_SAMPLE_THRESHOLD).toBe(30)
  })
})

describe('property nullability claims', () => {
  it('accepts a property with no claim, which keeps the default', () => {
    const parsed = PropertySchema.parse(BASE)
    expect(parsed.nullable).toBeUndefined()
    expect(parsed.evidence).toBeUndefined()
  })

  it('accepts a curated claim either way', () => {
    for (const nullable of [true, false]) {
      const result = PropertySchema.safeParse({
        ...BASE,
        nullable,
        evidence: { nullable: { source: 'curated', note: 'The app requires it' } },
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects a claim without evidence', () => {
    for (const nullable of [true, false]) {
      expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable }))).toEqual([
        ['evidence', 'nullable'],
      ])
    }
  })

  it('rejects evidence without a claim', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      evidence: { nullable: { source: 'curated', note: 'The app requires it' } },
    })
    expect(issuePaths(result)).toEqual([['nullable']])
  })

  it('rejects a curated claim with an empty note', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      nullable: false,
      evidence: { nullable: { source: 'curated', note: '' } },
    })
    expect(result.success).toBe(false)
  })

  it('accepts probe evidence of an empty value only for a nullable claim', () => {
    const evidence = { nullable: probe({ nullCount: 3 }) }
    expect(PropertySchema.safeParse({ ...BASE, nullable: true, evidence }).success).toBe(true)
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable: false, evidence }))).toEqual([
      ['nullable'],
      ['evidence', 'nullable', 'sampleSize'],
    ])
  })

  it('accepts a probe non-null claim at the threshold, and rejects one below it', () => {
    const at = { nullable: probe({ sampleSize: NON_NULL_SAMPLE_THRESHOLD }) }
    expect(PropertySchema.safeParse({ ...BASE, nullable: false, evidence: at }).success).toBe(true)
    const below = { nullable: probe({ sampleSize: NON_NULL_SAMPLE_THRESHOLD - 1 }) }
    expect(
      issuePaths(PropertySchema.safeParse({ ...BASE, nullable: false, evidence: below }))
    ).toEqual([['evidence', 'nullable', 'sampleSize']])
  })

  it('rejects probe counts that cannot happen', () => {
    expect(
      NullabilityEvidenceSchema.safeParse(probe({ sampleSize: 2, nullCount: 3 })).success
    ).toBe(false)
    expect(NullabilityEvidenceSchema.safeParse(probe({ sampleSize: -1 })).success).toBe(false)
    expect(NullabilityEvidenceSchema.safeParse(probe({ failedReads: 1.5 })).success).toBe(false)
  })

  it('rejects a probe nullable claim that observed no empty value', () => {
    const evidence = { nullable: probe({ nullCount: 0 }) }
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable: true, evidence }))).toEqual([
      ['evidence', 'nullable', 'nullCount'],
    ])
  })

  it('accepts a probe nullable claim whose failed reads all reported no value (-1728)', () => {
    const evidence = { nullable: probe({ sampleSize: 3, failedReads: 2, errorNumbers: [-1728] }) }
    const parsed = PropertySchema.safeParse({ ...BASE, nullable: true, evidence })
    expect(issuePaths(parsed)).toEqual([])
    expect(
      readsAbsentAsNull(PropertySchema.parse({ ...BASE, nullable: true, evidence }), COLLECTION)
    ).toBe(true)
  })

  it('rejects a probe nullable claim from failed reads that raised anything but -1728', () => {
    for (const errorNumbers of [[-1700], [-1728, -1700]]) {
      const evidence = { nullable: probe({ failedReads: 2, errorNumbers }) }
      expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable: true, evidence }))).toEqual([
        ['evidence', 'nullable', 'errorNumbers'],
      ])
    }
  })

  it('rejects a probe nullable claim whose every read failed with -1728 (structural absence is unsupported, D10)', () => {
    const evidence = { nullable: probe({ sampleSize: 0, failedReads: 5, errorNumbers: [-1728] }) }
    const claim = { ...BASE, nullable: true, evidence }
    expect(issuePaths(PropertySchema.safeParse(claim))).toEqual([
      ['evidence', 'nullable', 'sampleSize'],
    ])
    expect(readsAbsentAsNull({ nullable: true, evidence }, COLLECTION)).toBe(false)
  })

  it('rejects a probe nullable claim from failed reads whose error numbers were not recorded', () => {
    const evidence = { nullable: probe({ failedReads: 2 }) }
    const result = PropertySchema.safeParse({ ...BASE, nullable: true, evidence })
    // The fix is to record the error numbers, so the issue points there.
    expect(issuePaths(result)).toEqual([['evidence', 'nullable', 'errorNumbers']])
    expect(result.error?.issues[0]?.message).toContain('record errorNumbers')
  })

  it('rejects a non-null claim whose probe saw reads report no value', () => {
    const evidence = { nullable: probe({ failedReads: 1, errorNumbers: [-1728] }) }
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable: false, evidence }))).toEqual([
      ['nullable'],
    ])
  })

  it('rejects error numbers without failed reads, and a repeated error number', () => {
    expect(
      issuePaths(NullabilityEvidenceSchema.safeParse(probe({ errorNumbers: [-1728] })))
    ).toEqual([['errorNumbers']])
    expect(
      issuePaths(
        NullabilityEvidenceSchema.safeParse(probe({ failedReads: 2, errorNumbers: [-1728, -1728] }))
      )
    ).toEqual([['errorNumbers']])
    expect(
      NullabilityEvidenceSchema.safeParse(probe({ failedReads: 2, errorNumbers: [] })).success
    ).toBe(false)
  })

  it('takes a failed read as the empty value only on evidence that every failure reported no value', () => {
    const nullable = (evidence: ProbeNullabilityEvidence): boolean =>
      readsAbsentAsNull({ nullable: true, evidence: { nullable: evidence } }, COLLECTION)
    expect(nullable(probe({ failedReads: 1, errorNumbers: [-1728] }))).toBe(true)
    expect(nullable(probe({ nullCount: 2, failedReads: 1, errorNumbers: [-1728] }))).toBe(true)
    expect(nullable(probe({ nullCount: 2 }))).toBe(false)
    expect(nullable(probe({ nullCount: 2, failedReads: 1 }))).toBe(false)
    expect(nullable(probe({ nullCount: 2, failedReads: 1, errorNumbers: [-1700] }))).toBe(false)
    expect(
      readsAbsentAsNull({ nullable: true, evidence: { nullable: { source: 'sdef' } } }, COLLECTION)
    ).toBe(false)
    expect(readsAbsentAsNull({}, COLLECTION)).toBe(false)
  })

  it('requires the probe provenance fields', () => {
    const { appVersion: _appVersion, ...withoutVersion } = probe()
    expect(NullabilityEvidenceSchema.safeParse(withoutVersion).success).toBe(false)
  })

  it('accepts dictionary evidence only for a nullable claim', () => {
    const evidence = { nullable: { source: 'sdef' } }
    expect(PropertySchema.safeParse({ ...BASE, nullable: true, evidence }).success).toBe(true)
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, nullable: false, evidence }))).toEqual([
      ['nullable'],
    ])
  })

  it('rejects an unknown evidence source', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      nullable: true,
      evidence: { nullable: { source: 'guess' } },
    })
    expect(result.success).toBe(false)
  })
})

describe('curated absence claims on a resource with a single instance', () => {
  /** Reads a probe observed failing with -1728 on the one instance there is. */
  const ABSENT_READS = {
    observedAt: '2026-10-31T12:00:00Z',
    bundleId: 'com.example.archive',
    appVersion: '1.0',
    osVersion: '27.2',
    failedReads: 1,
    errorNumbers: [-1728],
    reason: 'The annex exists only once the user builds one',
  }
  const CURATED = {
    source: 'curated',
    note: 'The front desk is the only one, so one read cannot show whether the annex is structural',
    absentReads: ABSENT_READS,
  } as const
  const FOLDER = { access: 'r', type: 'string', description: 'The annex' } as const
  const ROOT_EVIDENCE = {
    source: 'dictionary',
    bundleId: 'com.example.archive',
    appVersion: '1.0',
    osVersion: '27.2',
  } as const
  const FRONT = { property: 'frontDesk', evidence: { ...ROOT_EVIDENCE, term: 'front desk' } }
  const BACK = { property: 'backDesk', evidence: { ...ROOT_EVIDENCE, term: 'back desk' } }

  /** A desk resource holding the annex claim, with the given singleton root kinds. */
  function desk(roots: Record<string, typeof FRONT> | undefined, evidence: object = CURATED) {
    return {
      name: 'Desk',
      plural: 'Desks',
      description: 'A desk',
      ...(roots === undefined ? {} : { roots }),
      properties: { annex: { ...FOLDER, nullable: true, evidence: { nullable: evidence } } },
    }
  }

  it('accepts the claim on a singleton root with one kind', () => {
    const parsed = ResourceSchema.safeParse(desk({ front: FRONT }))
    expect(issuePaths(parsed)).toEqual([])
  })

  it('accepts it as a claim about an inherited property of a singleton root', () => {
    const { properties: _properties, ...rest } = desk({ front: FRONT })
    const resource = {
      ...rest,
      inherits: { resource: 'Room', evidence: { ...ROOT_EVIDENCE, term: 'room' } },
      properties: {},
      inheritedClaims: { annex: { nullable: true, evidence: { nullable: CURATED } } },
    }
    expect(issuePaths(ResourceSchema.safeParse(resource))).toEqual([])
  })

  it('rejects the claim without a reason, pointing to probe evidence or unsupported', () => {
    const { reason: _reason, ...withoutReason } = ABSENT_READS
    const result = ResourceSchema.safeParse(
      desk({ front: FRONT }, { ...CURATED, absentReads: withoutReason })
    )
    expect(issuePaths(result)).toEqual([
      ['properties', 'annex', 'evidence', 'nullable', 'absentReads', 'reason'],
    ])
    expect(result.error?.issues[0]?.message).toContain('needs a reason')
    expect(result.error?.issues[0]?.message).toContain('probe evidence')
    expect(result.error?.issues[0]?.message).toContain('mark the property unsupported')
    const blank = { ...CURATED, absentReads: { ...ABSENT_READS, reason: '  ' } }
    expect(issuePaths(ResourceSchema.safeParse(desk({ front: FRONT }, blank)))).toEqual([
      ['properties', 'annex', 'evidence', 'nullable', 'absentReads', 'reason'],
    ])
  })

  it('rejects the claim on a resource with several instances, pointing to probe evidence or unsupported', () => {
    // A resource reached through a collection, and a root with two kinds:
    // each has several instances, so a probe tells the kinds of absence apart.
    for (const roots of [undefined, { front: FRONT, back: BACK }]) {
      const result = ResourceSchema.safeParse(desk(roots))
      expect(issuePaths(result)).toEqual([
        ['properties', 'annex', 'evidence', 'nullable', 'absentReads'],
      ])
      expect(result.error?.issues[0]?.message).toContain('single instance')
      expect(result.error?.issues[0]?.message).toContain('probe evidence')
      expect(result.error?.issues[0]?.message).toContain('mark the property unsupported')
    }
  })

  it('rejects it as a claim about an inherited property of a resource with several instances', () => {
    const resource = {
      name: 'Room',
      plural: 'Rooms',
      description: 'A room',
      inherits: { resource: 'Space', evidence: { ...ROOT_EVIDENCE, term: 'space' } },
      properties: {},
      inheritedClaims: { annex: { nullable: true, evidence: { nullable: CURATED } } },
    }
    expect(issuePaths(ResourceSchema.safeParse(resource))).toEqual([
      ['inheritedClaims', 'annex', 'evidence', 'nullable', 'absentReads'],
    ])
  })

  it('rejects recorded failures other than -1728, and a non-null claim', () => {
    for (const errorNumbers of [[-1700], [-1728, -1700], [-1728, -1728]]) {
      const evidence = { ...CURATED, absentReads: { ...ABSENT_READS, errorNumbers } }
      expect(issuePaths(ResourceSchema.safeParse(desk({ front: FRONT }, evidence)))).toEqual([
        ['properties', 'annex', 'evidence', 'nullable', 'absentReads', 'errorNumbers'],
      ])
    }
    const nonNull = {
      ...desk({ front: FRONT }),
      properties: { annex: { ...FOLDER, nullable: false, evidence: { nullable: CURATED } } },
    }
    expect(issuePaths(ResourceSchema.safeParse(nonNull))).toEqual([
      ['properties', 'annex', 'nullable'],
    ])
  })

  it('rejects absent reads on a command parameter, which is never read', () => {
    const parameter = {
      name: 'annex',
      type: 'string',
      description: 'An annex',
      nullable: true,
      evidence: { nullable: CURATED },
    }
    expect(issuePaths(CommandParameterSchema.safeParse(parameter))).toEqual([
      ['evidence', 'nullable', 'absentReads'],
    ])
  })

  it('takes a failed read as the empty value only for the accepted claim on a single instance', () => {
    const claim = { nullable: true, evidence: { nullable: CURATED } }
    expect(readsAbsentAsNull(claim, { roots: { front: FRONT } })).toBe(true)
    expect(readsAbsentAsNull(claim, COLLECTION)).toBe(false)
    expect(readsAbsentAsNull(claim, { roots: { front: FRONT, back: BACK } })).toBe(false)
    expect(readsAbsentAsNull(claim, { roots: {} })).toBe(false)
    expect(
      readsAbsentAsNull(
        { nullable: false, evidence: { nullable: CURATED } },
        { roots: { front: FRONT } }
      )
    ).toBe(false)
    // A curated claim without absent reads names its evidence but records no
    // failed read, so a failure is still a failure.
    const { absentReads: _absentReads, ...plain } = CURATED
    expect(
      readsAbsentAsNull(
        { nullable: true, evidence: { nullable: plain } },
        { roots: { front: FRONT } }
      )
    ).toBe(false)
    const other = { ...CURATED, absentReads: { ...ABSENT_READS, errorNumbers: [-1700] } }
    expect(
      readsAbsentAsNull(
        { nullable: true, evidence: { nullable: other } },
        { roots: { front: FRONT } }
      )
    ).toBe(false)
  })
})

describe('observedAt timestamps', () => {
  const NOT_UTC_ISO = [
    '2026-10-31',
    '2026-10-31T12:00:00',
    '2026-10-31T12:00:00+02:00',
    '31 Oct 2026',
    'yesterday',
    '',
  ]

  it('accepts an ISO 8601 UTC timestamp, with or without fractional seconds', () => {
    for (const observedAt of ['2026-10-31T12:00:00Z', '2026-10-31T12:00:00.000Z']) {
      expect(NullabilityEvidenceSchema.safeParse(probe({ observedAt })).success).toBe(true)
    }
  })

  it('rejects anything else on probe, curated, and resettability evidence', () => {
    for (const observedAt of NOT_UTC_ISO) {
      expect(NullabilityEvidenceSchema.safeParse(probe({ observedAt })).success).toBe(false)
      expect(
        NullabilityEvidenceSchema.safeParse({ source: 'curated', note: 'Checked', observedAt })
          .success
      ).toBe(false)
      expect(
        PropertySchema.safeParse({
          ...BASE,
          resettable: true,
          evidence: { resettable: { source: 'curated', note: 'Checked', observedAt } },
        }).success
      ).toBe(false)
    }
  })
})

describe('property resettability claims', () => {
  const resettable = { source: 'curated', note: 'reset.test.ts clears it on a scratch item' }

  it('accepts a resettable claim with a curated note', () => {
    const parsed = PropertySchema.parse({
      ...BASE,
      access: 'rw',
      resettable: true,
      evidence: { resettable },
    })
    expect(parsed.resettable).toBe(true)
    expect(parsed.evidence?.resettable).toEqual(resettable)
  })

  it('rejects a resettable claim without evidence', () => {
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, resettable: true }))).toEqual([
      ['evidence', 'resettable'],
    ])
  })

  it('rejects a resettable claim whose note is missing', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      resettable: true,
      evidence: { resettable: { source: 'curated' } },
    })
    expect(result.success).toBe(false)
  })

  it('rejects resettability evidence without a resettable claim', () => {
    expect(
      issuePaths(PropertySchema.safeParse({ ...BASE, resettable: false, evidence: { resettable } }))
    ).toEqual([['resettable']])
    expect(issuePaths(PropertySchema.safeParse({ ...BASE, evidence: { resettable } }))).toEqual([
      ['resettable'],
    ])
  })

  it('accepts resettable: false without evidence, which is the default', () => {
    expect(PropertySchema.safeParse({ ...BASE, resettable: false }).success).toBe(true)
  })

  it('accepts only curated resettability evidence', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      resettable: true,
      evidence: { resettable: { ...resettable, source: 'probe' } },
    })
    expect(result.success).toBe(false)
  })
})

describe('command parameter nullability claims', () => {
  const PARAM = { name: 'until', type: 'date', description: 'When' }

  it('accepts a parameter with no claim, and one with a claim and evidence', () => {
    expect(CommandParameterSchema.safeParse(PARAM).success).toBe(true)
    expect(
      CommandParameterSchema.safeParse({
        ...PARAM,
        nullable: true,
        evidence: { nullable: { source: 'curated', note: 'null means never' } },
      }).success
    ).toBe(true)
  })

  it('rejects a claim without evidence, and evidence without a claim', () => {
    expect(issuePaths(CommandParameterSchema.safeParse({ ...PARAM, nullable: true }))).toEqual([
      ['evidence', 'nullable'],
    ])
    expect(
      issuePaths(
        CommandParameterSchema.safeParse({
          ...PARAM,
          evidence: { nullable: { source: 'curated', note: 'null means never' } },
        })
      )
    ).toEqual([['nullable']])
  })
})

describe('the nullability probe block on a resource', () => {
  const RESOURCE = { name: 'Note', plural: 'Notes', description: 'A note', properties: {} }
  const BLOCK = {
    observedAt: '2026-10-31T12:00:00.000Z',
    bundleId: 'com.example.jotter',
    appVersion: '2.1',
    osVersion: '27.2',
    accessPath: 'folders/notes',
    itemsRead: 40,
    status: 'probed',
    skipped: ['body'],
  }

  it('is accepted and kept apart from the identifier probe block', () => {
    const parsed = ResourceSchema.parse({ ...RESOURCE, nullabilityProbe: BLOCK })
    expect(parsed.nullabilityProbe).toEqual(BLOCK)
    expect(parsed.probe).toBeUndefined()
  })

  it('requires a UTC timestamp, and accepts a sampled-parent count', () => {
    expect(
      ResourceSchema.safeParse({
        ...RESOURCE,
        nullabilityProbe: { ...BLOCK, observedAt: '2026-10-31T12:00:00+02:00' },
      }).success
    ).toBe(false)
    const parsed = ResourceSchema.parse({
      ...RESOURCE,
      nullabilityProbe: { ...BLOCK, sampledParents: 3 },
    })
    expect(parsed.nullabilityProbe?.sampledParents).toBe(3)
    expect(
      ResourceSchema.safeParse({ ...RESOURCE, nullabilityProbe: { ...BLOCK, sampledParents: -1 } })
        .success
    ).toBe(false)
  })

  it('rejects an unknown status and a negative item count', () => {
    expect(
      ResourceSchema.safeParse({ ...RESOURCE, nullabilityProbe: { ...BLOCK, status: 'done' } })
        .success
    ).toBe(false)
    expect(
      ResourceSchema.safeParse({ ...RESOURCE, nullabilityProbe: { ...BLOCK, itemsRead: -1 } })
        .success
    ).toBe(false)
  })
})

describe('loading a manifest', () => {
  it('keeps nullable, resettable, evidence, and the nullability probe block', () => {
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
      created:
        access: r
        type: date
        description: When the note was created
        nullable: true
        evidence:
          nullable:
            source: probe
            observedAt: '2026-10-31T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            nullCount: 3
            failedReads: 1
            note: replaced curated non-null claim
      priority:
        access: rw
        type: string
        description: How urgent
        resettable: true
        evidence:
          resettable:
            source: curated
            note: reset.test.ts clears it
            appVersion: '2.1'
    nullabilityProbe:
      observedAt: '2026-10-31T12:00:00.000Z'
      bundleId: com.example.jotter
      appVersion: '2.1'
      osVersion: '27.2'
      accessPath: notes
      itemsRead: 40
      status: probed
      skipped: []
enums: {}
hierarchy:
  children: {}
commands:
  archive:
    name: archive
    description: Archive
    scope: application
    parameters:
      - name: until
        type: date
        description: When
        required: false
        nullable: true
        evidence:
          nullable:
            source: sdef
`)
    const note = manifest.resources['Note']
    expect(note?.properties['created']).toMatchObject({
      nullable: true,
      evidence: {
        nullable: {
          source: 'probe',
          sampleSize: 40,
          nullCount: 3,
          failedReads: 1,
          note: 'replaced curated non-null claim',
        },
      },
    })
    expect(note?.properties['priority']).toMatchObject({
      resettable: true,
      evidence: {
        resettable: { source: 'curated', note: 'reset.test.ts clears it', appVersion: '2.1' },
      },
    })
    expect(note?.nullabilityProbe).toMatchObject({ accessPath: 'notes', itemsRead: 40 })
    expect(manifest.commands['archive']?.parameters[0]).toMatchObject({
      nullable: true,
      evidence: { nullable: { source: 'sdef' } },
    })
  })
})

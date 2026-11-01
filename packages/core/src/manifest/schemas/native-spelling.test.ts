/**
 * Tests for the dictionary-backed records a manifest keeps about an app's own
 * spelling: the native spelling of a collection or a property, recorded where
 * it differs from the spelling macts derives, and the resource-level
 * `unsupported` marker for a resource the app cannot provide, backed by the
 * app's dictionary or by a live read-only observation.
 *
 * Expected outcomes are derived by hand from the rules in
 * `phases/13-sdk-value-and-execution-contracts.md` (D10, native spellings and
 * unsupported resources):
 *
 * - dictionary evidence names the app build (bundle id, app version, macOS
 *   version) and the term, every field a non-empty string, and nothing else;
 * - dictionary absence evidence adds a finding, `no-class` or `not-an-element`;
 * - live absence evidence names the observation (an ISO 8601 UTC time, the
 *   app build), what was addressed in words, and the integer error number;
 * - a resource's marker takes either form of absence evidence;
 * - a recorded collection must differ from the lower camel case of the plural
 *   (`AirPlayDevices` derives `airPlayDevices`, so `airplayDevices` differs);
 * - a recorded property name must differ from the property's key;
 * - an unsupported property records no native name, and an unsupported
 *   resource no native collection.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 *   (how the automation bridge spells dictionary terms)
 * @see https://github.com/mike-north/macts/issues/165
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../loader.js'
import {
  DictionaryAbsenceEvidenceSchema,
  DictionarySpellingEvidenceSchema,
  LiveAbsenceEvidenceSchema,
  type DictionaryAbsenceEvidence,
  type DictionarySpellingEvidence,
  type LiveAbsenceEvidence,
} from './evidence.js'
import { PropertySchema } from './property.js'
import { ResourceSchema } from './resource.js'

const BASE = { access: 'r', type: 'string', description: 'A field' } as const

/** Music 1.7.2's dictionary on macOS 27.2, which writes "AirPlay devices". */
function spelling(term: string): DictionarySpellingEvidence {
  return {
    source: 'dictionary',
    bundleId: 'com.apple.Music',
    appVersion: '1.7.2',
    osVersion: '27.2',
    term,
  }
}

/** Screen Sharing 7.1's dictionary, which declares no class at all. */
function absence(overrides: Partial<DictionaryAbsenceEvidence> = {}): DictionaryAbsenceEvidence {
  return {
    source: 'dictionary',
    bundleId: 'com.apple.ScreenSharing',
    appVersion: '7.1',
    osVersion: '27.2',
    term: 'connection',
    finding: 'no-class',
    ...overrides,
  }
}

/**
 * Contacts 14.0 on macOS 27.2, which fails every read of an instant message
 * with error -1700.
 */
function live(overrides: Partial<LiveAbsenceEvidence> = {}): LiveAbsenceEvidence {
  return {
    source: 'live',
    observedAt: '2026-11-01T16:40:48.000Z',
    bundleId: 'com.apple.AddressBook',
    appVersion: '14.0',
    osVersion: '27.2',
    expression: 'every property of the instant messages of a person, and the item property record',
    errorNumber: -1700,
    ...overrides,
  }
}

const DEVICE = {
  name: 'AirPlayDevice',
  plural: 'AirPlayDevices',
  description: 'An AirPlay device',
  properties: { name: BASE },
}

/** The issue paths a failed parse reports, or `[]` when it succeeds. */
function issuePaths(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}): PropertyKey[][] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.path) ?? [])
}

/** The issue messages a failed parse reports, or `[]` when it succeeds. */
function issueMessages(result: {
  success: boolean
  error?: { issues: { message: string }[] }
}): string[] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? [])
}

describe('dictionary spelling evidence', () => {
  it('accepts the app build and the term as the dictionary writes it', () => {
    expect(DictionarySpellingEvidenceSchema.parse(spelling('AirPlay devices'))).toEqual(
      spelling('AirPlay devices')
    )
  })

  it.each(['bundleId', 'appVersion', 'osVersion', 'term'] as const)(
    'rejects an empty %s',
    (field) => {
      const result = DictionarySpellingEvidenceSchema.safeParse({
        ...spelling('URL'),
        [field]: '',
      })
      expect(issuePaths(result)).toEqual([[field]])
    }
  )

  it.each(['bundleId', 'appVersion', 'osVersion', 'term'] as const)(
    'rejects a missing %s',
    (field) => {
      const { [field]: _omitted, ...rest } = spelling('URL')
      expect(DictionarySpellingEvidenceSchema.safeParse(rest).success).toBe(false)
    }
  )

  it('rejects any source but the dictionary', () => {
    expect(
      DictionarySpellingEvidenceSchema.safeParse({ ...spelling('URL'), source: 'probe' }).success
    ).toBe(false)
  })

  it('rejects an unknown field', () => {
    const result = DictionarySpellingEvidenceSchema.safeParse({
      ...spelling('URL'),
      observedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(result.success).toBe(false)
  })
})

describe('dictionary absence evidence', () => {
  it.each(['no-class', 'not-an-element'] as const)('accepts the finding %s', (finding) => {
    expect(DictionaryAbsenceEvidenceSchema.parse(absence({ finding })).finding).toBe(finding)
  })

  it('rejects any other finding', () => {
    const result = DictionaryAbsenceEvidenceSchema.safeParse({ ...absence(), finding: 'empty' })
    expect(issuePaths(result)).toEqual([['finding']])
  })

  it('rejects a missing finding', () => {
    const { finding: _finding, ...rest } = absence()
    expect(DictionaryAbsenceEvidenceSchema.safeParse(rest).success).toBe(false)
  })

  it.each(['bundleId', 'appVersion', 'osVersion', 'term'] as const)(
    'rejects an empty %s',
    (field) => {
      const result = DictionaryAbsenceEvidenceSchema.safeParse({ ...absence(), [field]: '' })
      expect(issuePaths(result)).toEqual([[field]])
    }
  )

  it('rejects an unknown field', () => {
    expect(DictionaryAbsenceEvidenceSchema.safeParse({ ...absence(), note: 'x' }).success).toBe(
      false
    )
  })
})

describe('live absence evidence', () => {
  it('accepts the observation, what was addressed, and the error number', () => {
    expect(LiveAbsenceEvidenceSchema.parse(live())).toEqual(live())
  })

  it.each(['bundleId', 'appVersion', 'osVersion', 'expression'] as const)(
    'rejects an empty %s',
    (field) => {
      expect(issuePaths(LiveAbsenceEvidenceSchema.safeParse({ ...live(), [field]: '' }))).toEqual([
        [field],
      ])
    }
  )

  it.each(['observedAt', 'expression', 'errorNumber'] as const)('rejects a missing %s', (field) => {
    const { [field]: _omitted, ...rest } = live()
    expect(LiveAbsenceEvidenceSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a time that is not ISO 8601 UTC', () => {
    // An offset is not UTC, and a date alone is not a timestamp.
    for (const observedAt of ['2026-11-01T08:40:48.000-08:00', '2026-11-01']) {
      expect(issuePaths(LiveAbsenceEvidenceSchema.safeParse(live({ observedAt })))).toEqual([
        ['observedAt'],
      ])
    }
  })

  it('rejects an error number that is not an integer', () => {
    expect(issuePaths(LiveAbsenceEvidenceSchema.safeParse(live({ errorNumber: -1.5 })))).toEqual([
      ['errorNumber'],
    ])
    expect(LiveAbsenceEvidenceSchema.safeParse({ ...live(), errorNumber: '-1700' }).success).toBe(
      false
    )
  })

  it('rejects any source but a live observation, and an unknown field', () => {
    expect(LiveAbsenceEvidenceSchema.safeParse({ ...live(), source: 'probe' }).success).toBe(false)
    expect(LiveAbsenceEvidenceSchema.safeParse({ ...live(), value: 'x' }).success).toBe(false)
  })
})

describe('a native collection spelling', () => {
  it('accepts a spelling that differs from the one derived from the plural', () => {
    // AirPlayDevices derives airPlayDevices; the app spells "AirPlay devices"
    // as airplayDevices.
    const parsed = ResourceSchema.parse({
      ...DEVICE,
      native: { collection: 'airplayDevices', evidence: spelling('AirPlay devices') },
    })
    expect(parsed.native).toEqual({
      collection: 'airplayDevices',
      evidence: spelling('AirPlay devices'),
    })
  })

  it('rejects the derived spelling as redundant', () => {
    const result = ResourceSchema.safeParse({
      ...DEVICE,
      native: { collection: 'airPlayDevices', evidence: spelling('AirPlay devices') },
    })
    expect(issuePaths(result)).toEqual([['native', 'collection']])
    expect(issueMessages(result)[0]).toMatch(/redundant/)
  })

  it('rejects the derived spelling of an acronym plural as redundant', () => {
    // URLTracks derives urlTracks: a run of capitals is one word.
    const result = ResourceSchema.safeParse({
      ...DEVICE,
      plural: 'URLTracks',
      native: { collection: 'urlTracks', evidence: spelling('URL tracks') },
    })
    expect(issuePaths(result)).toEqual([['native', 'collection']])
  })

  it('rejects a spelling without evidence, an empty one, or an unknown field', () => {
    expect(ResourceSchema.safeParse({ ...DEVICE, native: { collection: 'x' } }).success).toBe(false)
    expect(
      ResourceSchema.safeParse({
        ...DEVICE,
        native: { collection: '', evidence: spelling('AirPlay devices') },
      }).success
    ).toBe(false)
    expect(
      ResourceSchema.safeParse({
        ...DEVICE,
        native: { collection: 'airplayDevices', evidence: spelling('AirPlay devices'), x: 1 },
      }).success
    ).toBe(false)
  })
})

describe('a native property spelling', () => {
  it('accepts a name that differs from the key', () => {
    const parsed = ResourceSchema.parse({
      ...DEVICE,
      properties: { uRL: { ...BASE, native: { name: 'url', evidence: spelling('URL') } } },
    })
    expect(parsed.properties['uRL']?.native).toEqual({ name: 'url', evidence: spelling('URL') })
  })

  it('rejects a name equal to the key as redundant', () => {
    const result = ResourceSchema.safeParse({
      ...DEVICE,
      properties: { url: { ...BASE, native: { name: 'url', evidence: spelling('URL') } } },
    })
    expect(issuePaths(result)).toEqual([['properties', 'url', 'native', 'name']])
    expect(issueMessages(result)[0]).toMatch(/redundant/)
  })

  it('rejects a native name on a property marked unsupported', () => {
    const result = PropertySchema.safeParse({
      ...BASE,
      native: { name: 'url', evidence: spelling('URL') },
      unsupported: {
        reason: 'The app does not implement this property.',
        evidence: {
          source: 'probe',
          observedAt: '2026-11-01T06:05:32.244Z',
          bundleId: 'com.apple.Music',
          appVersion: '1.7.2',
          osVersion: '27.2',
          sampleSize: 3,
          failedReads: 3,
          errorNumbers: [-1728],
        },
      },
    })
    expect(issuePaths(result)).toEqual([['native']])
  })

  it('rejects a name without evidence, an empty name, or an unknown field', () => {
    expect(PropertySchema.safeParse({ ...BASE, native: { name: 'url' } }).success).toBe(false)
    expect(
      PropertySchema.safeParse({ ...BASE, native: { name: '', evidence: spelling('URL') } }).success
    ).toBe(false)
    expect(
      PropertySchema.safeParse({
        ...BASE,
        native: { name: 'url', evidence: spelling('URL'), x: 1 },
      }).success
    ).toBe(false)
  })
})

describe('the unsupported marker on a resource', () => {
  it('accepts dictionary absence evidence', () => {
    const parsed = ResourceSchema.parse({ ...DEVICE, unsupported: { evidence: absence() } })
    expect(parsed.unsupported).toEqual({ evidence: absence() })
  })

  it('accepts live absence evidence', () => {
    const parsed = ResourceSchema.parse({ ...DEVICE, unsupported: { evidence: live() } })
    expect(parsed.unsupported).toEqual({ evidence: live() })
  })

  it('rejects live evidence that carries a dictionary finding', () => {
    // The two forms are told apart by source; neither takes the other's fields.
    expect(
      ResourceSchema.safeParse({
        ...DEVICE,
        unsupported: { evidence: { ...live(), finding: 'no-class' } },
      }).success
    ).toBe(false)
    expect(
      ResourceSchema.safeParse({
        ...DEVICE,
        unsupported: { evidence: { ...absence(), errorNumber: -1728 } },
      }).success
    ).toBe(false)
  })

  it('rejects a marker without evidence, or with an unknown field', () => {
    expect(ResourceSchema.safeParse({ ...DEVICE, unsupported: {} }).success).toBe(false)
    expect(
      ResourceSchema.safeParse({
        ...DEVICE,
        unsupported: { evidence: absence(), reason: 'x' },
      }).success
    ).toBe(false)
  })

  it('rejects spelling evidence in place of absence evidence', () => {
    expect(
      ResourceSchema.safeParse({ ...DEVICE, unsupported: { evidence: spelling('connection') } })
        .success
    ).toBe(false)
  })

  it('rejects a native collection on a resource marked unsupported', () => {
    const result = ResourceSchema.safeParse({
      ...DEVICE,
      native: { collection: 'airplayDevices', evidence: spelling('AirPlay devices') },
      unsupported: { evidence: absence() },
    })
    expect(issuePaths(result)).toEqual([['native']])
  })
})

describe('loading a manifest with native spellings and an unsupported resource', () => {
  it('keeps both records', () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { name: Music, bundleId: com.apple.Music }
resources:
  AirPlayDevice:
    name: AirPlayDevice
    plural: AirPlayDevices
    description: An AirPlay device
    native:
      collection: airplayDevices
      evidence: { source: dictionary, bundleId: com.apple.Music, appVersion: '1.7.2', osVersion: '27.2', term: AirPlay devices }
    properties:
      eQ:
        access: rw
        description: The equalizer
        native:
          name: eq
          evidence: { source: dictionary, bundleId: com.apple.Music, appVersion: '1.7.2', osVersion: '27.2', term: EQ }
  Connection:
    name: Connection
    plural: Connections
    description: A connection
    unsupported:
      evidence: { source: dictionary, bundleId: com.apple.Music, appVersion: '1.7.2', osVersion: '27.2', term: connection, finding: no-class }
hierarchy: { children: {} }
`)
    expect(manifest.resources['AirPlayDevice']?.native?.collection).toBe('airplayDevices')
    expect(manifest.resources['AirPlayDevice']?.properties['eQ']?.native?.name).toBe('eq')
    expect(manifest.resources['Connection']?.unsupported?.evidence).toMatchObject({
      source: 'dictionary',
      finding: 'no-class',
    })
  })
})

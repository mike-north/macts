/**
 * Tests for canonical resource-identifier derivation.
 *
 * These pin the single source of truth for which property identifies a resource
 * and the canonical key under which list output exposes it. The values are
 * derived by hand from the manifest schema (`identifiers` array, primary-first),
 * NOT from program output. See issue: `calendars.list` returned no usable
 * identifier, and list (`calendarIdentifier`) vs write (`calendarId`) name drift.
 *
 * @see ../manifest/schemas/resource.ts (IdentifierSchema, ResourceSchema)
 */

import { describe, it, expect } from 'vitest'
import type { Resource } from './schemas/resource.js'
import { RANGE_READ_SUPPORTED, UNIQUE_CLAIM } from './test-support/unique-claim.js'
import {
  CANONICAL_IDENTIFIER_KEY,
  listOperationPages,
  resolveCanonicalIdentifierSource,
  resolveIdentifierTargeting,
  resolvePrimaryIdentifierProperty,
  resolveListOutputProperties,
} from './identifier.js'

/** Build a minimal resource for identifier-derivation tests. */
function makeResource(overrides: Partial<Resource>): Resource {
  return {
    name: 'Thing',
    plural: 'Things',
    description: 'A thing',
    properties: {},
    ...overrides,
  }
}

describe('CANONICAL_IDENTIFIER_KEY', () => {
  it('is the single canonical key list output exposes the identifier under', () => {
    // The reconciled name every surface agrees on. A consumer reads `item.id`.
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
  })
})

describe('resolvePrimaryIdentifierProperty', () => {
  it('returns the property flagged primary', () => {
    const resource = makeResource({
      identifiers: [
        { property: 'name', primary: false },
        { property: 'calendarIdentifier', primary: true },
      ],
    })
    // resource.ts: the entry flagged `primary` wins.
    expect(resolvePrimaryIdentifierProperty(resource)).toBe('calendarIdentifier')
  })

  it('falls back to the first identifier when none is flagged primary', () => {
    const resource = makeResource({
      identifiers: [
        { property: 'uid', primary: false },
        { property: 'name', primary: false },
      ],
    })
    expect(resolvePrimaryIdentifierProperty(resource)).toBe('uid')
  })

  it('returns undefined when the resource declares no identifiers', () => {
    // Negative: a resource with no manifest identifier has no addressable id.
    expect(resolvePrimaryIdentifierProperty(makeResource({}))).toBeUndefined()
    expect(resolvePrimaryIdentifierProperty(makeResource({ identifiers: [] }))).toBeUndefined()
  })

  it('returns undefined for an undefined resource', () => {
    expect(resolvePrimaryIdentifierProperty(undefined)).toBeUndefined()
  })
})

describe('resolveIdentifierTargeting', () => {
  it('defaults to byId targeting on the declared identifier property', () => {
    // schema: `targeting` is optional and absent means the byId default. The
    // runtime property for byId is the identifier property itself.
    const resource = makeResource({
      identifiers: [{ property: 'uid', primary: true }],
    })
    expect(resolveIdentifierTargeting(resource)).toEqual({
      strategy: 'byId',
      property: 'uid',
    })
  })

  it('returns byProperty targeting matching on the identifier property', () => {
    // Calendar fix: the declared id is the working property (`name`) and the
    // runtime targets via whose({ name: ... }) rather than byId().
    const resource = makeResource({
      identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
    })
    expect(resolveIdentifierTargeting(resource)).toEqual({
      strategy: 'byProperty',
      property: 'name',
    })
  })

  it('uses runtimeProperty as the whose-match key when provided', () => {
    // When the value-carrying property differs from the whose-match property,
    // runtimeProperty wins for the runtime lookup.
    const resource = makeResource({
      identifiers: [
        {
          property: 'calendarIdentifier',
          primary: true,
          targeting: 'byProperty',
          runtimeProperty: 'name',
        },
      ],
    })
    expect(resolveIdentifierTargeting(resource)).toEqual({
      strategy: 'byProperty',
      property: 'name',
    })
  })

  it('honors the primary entry when multiple identifiers are declared', () => {
    const resource = makeResource({
      identifiers: [
        { property: 'uid', primary: false },
        { property: 'name', primary: true, targeting: 'byProperty' },
      ],
    })
    expect(resolveIdentifierTargeting(resource)).toEqual({
      strategy: 'byProperty',
      property: 'name',
    })
  })

  it('returns undefined when no identifier is declared', () => {
    // Negative: a resource with no manifest identifier cannot be targeted at all.
    expect(resolveIdentifierTargeting(makeResource({}))).toBeUndefined()
    expect(resolveIdentifierTargeting(makeResource({ identifiers: [] }))).toBeUndefined()
    expect(resolveIdentifierTargeting(undefined)).toBeUndefined()
  })
})

describe('resolveListOutputProperties', () => {
  it('includes the primary identifier even when it is not declared as a property', () => {
    // The bug this guards: list read `Object.keys(properties)`, so an identifier
    // declared only in `identifiers` (not under `properties`) was omitted —
    // leaving no usable id for sibling get/delete/write operations.
    const resource = makeResource({
      properties: {
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    })
    const props = resolveListOutputProperties(resource)
    expect(props).toContain('calendarIdentifier')
    expect(props).toContain('name')
  })

  it('does not duplicate the identifier when it is also a declared property', () => {
    const resource = makeResource({
      properties: {
        calendarIdentifier: { access: 'r', type: 'string', description: 'Id', optional: false },
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    })
    const props = resolveListOutputProperties(resource)
    expect(props.filter((p) => p === 'calendarIdentifier')).toHaveLength(1)
  })

  it('returns declared properties when the resource has no identifier (graceful)', () => {
    // Negative: no identifier declared — list still returns the declared props,
    // it simply cannot surface a canonical id.
    const resource = makeResource({
      properties: {
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
    })
    expect(resolveListOutputProperties(resource)).toEqual(['name'])
  })

  it('omits a property marked unsupported, keeping the identifier', () => {
    // A marked property is declared by the dictionary but cannot be provided,
    // so a list never reads it (manifest/unsupported.ts).
    const resource = makeResource({
      properties: {
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
        expandable: {
          access: 'r',
          type: 'boolean',
          description: 'Never readable',
          optional: true,
          unsupported: {
            reason: 'Every read fails.',
            evidence: {
              source: 'probe',
              observedAt: '2026-11-01T06:05:32.244Z',
              bundleId: 'com.example.app',
              appVersion: '1.0',
              osVersion: '27.2',
              sampleSize: 3,
              failedReads: 3,
              errorNumbers: [-1728],
            },
          },
        },
      },
      identifiers: [{ property: 'uid', primary: true }],
    })
    expect(resolveListOutputProperties(resource)).toEqual(['name', 'uid'])
  })

  it('falls back to ["name"] for an empty resource with no identifier', () => {
    expect(resolveListOutputProperties(makeResource({}))).toEqual(['name'])
    expect(resolveListOutputProperties(undefined)).toEqual(['name'])
  })
})

describe('listOperationPages', () => {
  const LIST = { scope: 'resource', name: 'list' }
  const NOT_UNIQUE = {
    unique: false,
    evidence: { unique: { source: 'curated' as const, note: 'Values repeat' } },
  }
  const RANGE_READ_FAILED = {
    rangeRead: {
      supported: false,
      evidence: { ...RANGE_READ_SUPPORTED.rangeRead.evidence, errorNumbers: [-1708] },
    },
  }

  it('pages a list whose primary identifier is claimed unique and whose range read passed', () => {
    const resource = makeResource({
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    })
    expect(listOperationPages(LIST, resource)).toBe(true)
  })

  it('pages a byProperty identifier claimed unique: uniqueness, not targeting, decides', () => {
    const resource = makeResource({
      identifiers: [{ property: 'id', primary: true, targeting: 'byProperty', ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    })
    expect(listOperationPages(LIST, resource)).toBe(true)
  })

  it('does not page a unique identifier whose resource records no range read', () => {
    // Regression: a list paged on the uniqueness claim alone, and an app whose
    // collection rejects range reads (Music playlists, -1708) failed every page.
    const resource = makeResource({
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
    })
    expect(listOperationPages(LIST, resource)).toBe(false)
  })

  it('does not page a unique identifier whose range read was observed to fail', () => {
    const resource = makeResource({
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_FAILED,
    })
    expect(listOperationPages(LIST, resource)).toBe(false)
  })

  it.each([
    { label: 'makes no uniqueness claim', identifiers: [{ property: 'id', primary: true }] },
    {
      label: 'is claimed not unique',
      identifiers: [{ property: 'id', primary: true, ...NOT_UNIQUE }],
    },
    {
      label: 'is a byProperty identifier with no claim',
      identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' as const }],
    },
    {
      label: 'is not the claimed one: only the primary identifier counts',
      identifiers: [
        { property: 'id', primary: false, ...UNIQUE_CLAIM },
        { property: 'name', primary: true },
      ],
    },
  ])(
    'does not page a list whose primary identifier $label, even with a supported range read',
    ({ identifiers }) => {
      expect(listOperationPages(LIST, makeResource({ identifiers, ...RANGE_READ_SUPPORTED }))).toBe(
        false
      )
    }
  )

  it('does not page a list of a resource with no identifier, or no resource', () => {
    expect(listOperationPages(LIST, makeResource({ ...RANGE_READ_SUPPORTED }))).toBe(false)
    expect(listOperationPages(LIST, undefined)).toBe(false)
  })

  it.each([
    { label: 'another resource command', command: { scope: 'resource', name: 'get' } },
    { label: 'an application command named list', command: { scope: 'application', name: 'list' } },
  ])('never pages $label', ({ command }) => {
    const resource = makeResource({
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    })
    expect(listOperationPages(command, resource)).toBe(false)
  })
})

describe('resolveCanonicalIdentifierSource', () => {
  const numericId = {
    access: 'r' as const,
    type: 'integer' as const,
    description: 'Numeric id of an entry in one playlist',
    optional: false,
  }
  const persistentID = {
    access: 'r' as const,
    type: 'string' as const,
    description: 'Persistent ID',
    optional: false,
  }

  it('mirrors the runtime targeting property when the resource has no id field', () => {
    const resource = makeResource({
      properties: { name: { access: 'rw', type: 'string', description: 'Name', optional: false } },
      identifiers: [
        {
          property: 'calendarIdentifier',
          primary: true,
          targeting: 'byProperty',
          runtimeProperty: 'name',
        },
      ],
    })
    expect(resolveCanonicalIdentifierSource(resource)).toBe('name')
  })

  // Regression (#213): a Music track has a numeric `id` and is identified by
  // `persistentID`; the alias overwrote the integer `id` with the hex string.
  it('gives no alias when the resource has its own usable id property', () => {
    const resource = makeResource({
      properties: { id: numericId, persistentID },
      identifiers: [{ property: 'persistentID', primary: true, targeting: 'byProperty' }],
    })
    expect(resolveCanonicalIdentifierSource(resource)).toBeUndefined()
  })

  it('gives no alias for a resource identified by its own id property', () => {
    const resource = makeResource({
      properties: { id: persistentID },
      identifiers: [{ property: 'id', primary: true }],
    })
    expect(resolveCanonicalIdentifierSource(resource)).toBeUndefined()
  })

  it('mirrors the identifier when an id property is marked unsupported', () => {
    const resource = makeResource({
      properties: {
        uid: persistentID,
        id: {
          ...numericId,
          unsupported: {
            reason: 'Every read fails.',
            evidence: {
              source: 'probe',
              observedAt: '2026-11-01T06:05:32.244Z',
              bundleId: 'com.example.app',
              appVersion: '1.0',
              osVersion: '27.2',
              sampleSize: 3,
              failedReads: 3,
              errorNumbers: [-1728],
            },
          },
        },
      },
      identifiers: [{ property: 'uid', primary: true }],
    })
    expect(resolveCanonicalIdentifierSource(resource)).toBe('uid')
  })

  it('gives no alias when no identifier is declared, or for no resource', () => {
    expect(resolveCanonicalIdentifierSource(makeResource({}))).toBeUndefined()
    expect(resolveCanonicalIdentifierSource(undefined)).toBeUndefined()
  })
})

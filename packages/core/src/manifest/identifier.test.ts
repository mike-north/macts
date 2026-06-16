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
import {
  CANONICAL_IDENTIFIER_KEY,
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

  it('falls back to ["name"] for an empty resource with no identifier', () => {
    expect(resolveListOutputProperties(makeResource({}))).toEqual(['name'])
    expect(resolveListOutputProperties(undefined)).toEqual(['name'])
  })
})

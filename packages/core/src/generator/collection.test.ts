import { describe, it, expect } from 'vitest'
import { generateCollectionClass } from './collection.js'
import { createGeneratorContext } from './context.js'
import type { AppManifest } from '../manifest/index.js'

const mockManifest: AppManifest = {
  version: '1.0',
  app: { bundleId: 'com.test.app', name: 'TestApp', tccEntitlements: [] },
  suites: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
      },
    },
  },
  enums: {},
  hierarchy: { children: {} },
  relationships: [],
  commands: {},
}

/**
 * A manifest whose primary identifier is neither `uid` nor `id`. Used to
 * regression-test that the collection generator derives the identifier from the
 * manifest rather than falling back to the old hardcoded `uid ?? id` pattern.
 *
 * Mirrors the real Calendar app-manifest pattern where the identifier property
 * is `calendarIdentifier` — a non-default name the old code would have missed.
 */
const calendarIdentifierManifest: AppManifest = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.iCal',
    name: 'Calendar',
    tccEntitlements: ['calendar'],
  },
  suites: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        calendarIdentifier: {
          access: 'r',
          description: 'Unique identifier',
          type: 'string',
          optional: false,
        },
      },
    },
  },
  enums: {},
  hierarchy: { children: {} },
  relationships: [],
  commands: {},
}

describe('generateCollectionClass', () => {
  const ctx = createGeneratorContext(mockManifest, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  })

  it('should generate class with name', () => {
    const resource = ctx.getResource('Calendar')
    expect(resource).toBeDefined()
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.name).toBe('CalendarCollection')
    expect(result.content).toContain('class CalendarCollection')
  })

  it('should generate list method', () => {
    const resource = ctx.getResource('Calendar')
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.content).toContain('async list()')
    expect(result.content).toContain('CalendarInstance[]')
  })

  it('should generate get method', () => {
    const resource = ctx.getResource('Calendar')
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.content).toContain('async get(id: string)')
  })

  it('should generate getByName method', () => {
    const resource = ctx.getResource('Calendar')
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.content).toContain('async getByName(name: string)')
  })

  it('should generate create method', () => {
    const resource = ctx.getResource('Calendar')
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.content).toContain('async create(input: CalendarCreateInput)')
  })

  it('should generate find method', () => {
    const resource = ctx.getResource('Calendar')
    if (!resource) return

    const result = generateCollectionClass(resource, ctx)
    expect(result.content).toContain('async find(predicate:')
  })

  describe('manifest-derived identifier property (regression: was hardcoded uid ?? id)', () => {
    const ctx2 = createGeneratorContext(calendarIdentifierManifest, {
      outDir: '/tmp/out',
      packageName: '@macts/sdk-calendar',
    })

    it('emits the manifest-declared identifier property in list()', () => {
      const resource = ctx2.getResource('Calendar')
      expect(resource).toBeDefined()
      if (!resource) return

      const result = generateCollectionClass(resource, ctx2)
      // The generated list() must read from 'calendarIdentifier', not 'uid' or 'id'.
      expect(result.content).toContain("['calendarIdentifier']")
      expect(result.content).not.toContain('uid')
      expect(result.content).not.toContain("['id']")
    })

    it('emits the manifest-declared identifier property in create()', () => {
      const resource = ctx2.getResource('Calendar')
      if (!resource) return

      const result = generateCollectionClass(resource, ctx2)
      // The create() return path must also use the manifest-declared property,
      // not the old fallback.
      const createMethodStart = result.content.indexOf('async create(')
      expect(createMethodStart).toBeGreaterThan(-1)
      const createMethodBody = result.content.slice(createMethodStart)
      expect(createMethodBody).toContain("['calendarIdentifier']")
    })
  })
})

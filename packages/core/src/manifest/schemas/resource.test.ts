import { describe, it, expect } from 'vitest'
import {
  IdentifierSchema,
  IdentifierTargetingSchema,
  ResourceSchema,
  RuntimeProbeSchema,
  ProbeStatusSchema,
  pageReadFor,
} from './resource.js'
import { ZodError } from 'zod'

describe('IdentifierTargetingSchema', () => {
  it('accepts the two valid strategies', () => {
    expect(IdentifierTargetingSchema.parse('byId')).toBe('byId')
    expect(IdentifierTargetingSchema.parse('byProperty')).toBe('byProperty')
  })

  it('rejects any other value', () => {
    expect(() => IdentifierTargetingSchema.parse('byName')).toThrow(ZodError)
    expect(() => IdentifierTargetingSchema.parse('')).toThrow(ZodError)
  })
})

describe('IdentifierSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid identifier', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
      })

      expect(result).toEqual({
        property: 'id',
        primary: false, // default value
      })
    })

    it('should accept identifier with primary flag', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
        primary: true,
      })

      expect(result).toEqual({
        property: 'id',
        primary: true,
      })
    })

    it('should accept identifier with explicit false primary', () => {
      const result = IdentifierSchema.parse({
        property: 'name',
        primary: false,
      })

      expect(result).toEqual({
        property: 'name',
        primary: false,
      })
    })

    it('should accept identifier with byProperty targeting', () => {
      // resource.ts: `targeting` selects how the runtime addresses the resource.
      const result = IdentifierSchema.parse({
        property: 'name',
        primary: true,
        targeting: 'byProperty',
      })

      expect(result).toEqual({
        property: 'name',
        primary: true,
        targeting: 'byProperty',
      })
    })

    it('should accept identifier with explicit byId targeting', () => {
      const result = IdentifierSchema.parse({
        property: 'uid',
        primary: true,
        targeting: 'byId',
      })

      expect(result.targeting).toBe('byId')
    })

    it('should accept identifier with an explicit runtimeProperty', () => {
      const result = IdentifierSchema.parse({
        property: 'calendarIdentifier',
        primary: true,
        targeting: 'byProperty',
        runtimeProperty: 'name',
      })

      expect(result.runtimeProperty).toBe('name')
    })

    it('leaves targeting undefined when omitted (byId is applied by the resolver, not the schema)', () => {
      // The schema keeps `targeting` optional rather than defaulting it, so the
      // inferred Identifier type stays narrow and already-generated manifest
      // literals (which omit `targeting`) still satisfy `as AppManifest`.
      const result = IdentifierSchema.parse({ property: 'uid', primary: true })
      expect(result.targeting).toBeUndefined()
      expect('runtimeProperty' in result).toBe(false)
    })
  })

  describe('negative cases', () => {
    it('should reject identifier without property', () => {
      expect(() =>
        IdentifierSchema.parse({
          primary: true,
        })
      ).toThrow(ZodError)
    })

    it('should reject identifier with non-string property', () => {
      expect(() =>
        IdentifierSchema.parse({
          property: 123,
          primary: true,
        })
      ).toThrow(ZodError)
    })

    it('should reject identifier with non-boolean primary', () => {
      expect(() =>
        IdentifierSchema.parse({
          property: 'id',
          primary: 'yes',
        })
      ).toThrow(ZodError)
    })

    it('should reject identifier with an unknown targeting strategy', () => {
      // Only the enum members byId / byProperty are valid.
      expect(() =>
        IdentifierSchema.parse({
          property: 'name',
          primary: true,
          targeting: 'byMagic',
        })
      ).toThrow(ZodError)
    })

    it('should reject identifier with non-string runtimeProperty', () => {
      expect(() =>
        IdentifierSchema.parse({
          property: 'name',
          primary: true,
          targeting: 'byProperty',
          runtimeProperty: 123,
        })
      ).toThrow(ZodError)
    })

    it('should reject empty object', () => {
      expect(() => IdentifierSchema.parse({})).toThrow(ZodError)
    })
  })

  describe('edge cases', () => {
    it('should accept empty string property', () => {
      const result = IdentifierSchema.parse({
        property: '',
      })

      expect(result.property).toBe('')
    })

    it('should handle extra properties by ignoring them', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
        primary: true,
        extra: 'ignored',
      })

      // Zod strips unknown properties by default
      expect(result).toEqual({
        property: 'id',
        primary: true,
      })
    })
  })
})

describe('ResourceSchema identifier uniqueness claims', () => {
  /** A resource whose only identifier is `identifier`. */
  function withIdentifier(identifier: Record<string, unknown>) {
    return ResourceSchema.safeParse({
      name: 'Item',
      plural: 'Items',
      description: 'An item',
      properties: { id: { access: 'r', description: 'Item id' } },
      identifiers: [{ property: 'id', primary: true, ...identifier }],
    })
  }

  it.each([
    { label: 'unique, from the dictionary', unique: true, source: 'sdef' },
    { label: 'not unique, from curation', unique: false, source: 'curated' },
  ])('accepts a claim that the identifier is $label', ({ unique, source }) => {
    const parsed = withIdentifier({ unique, evidence: { unique: { source, note: 'Why' } } })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.identifiers?.[0]).toMatchObject({
      unique,
      evidence: { unique: { source } },
    })
  })

  it('accepts an identifier that makes no claim', () => {
    expect(withIdentifier({}).success).toBe(true)
  })

  it('rejects a claim with no evidence, at the missing evidence', () => {
    const parsed = withIdentifier({ unique: true })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.map((issue) => issue.path)).toEqual([
      ['identifiers', 0, 'evidence', 'unique'],
    ])
  })

  it('rejects evidence with no claim, at the missing claim', () => {
    const parsed = withIdentifier({ evidence: { unique: { source: 'sdef', note: 'Why' } } })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.map((issue) => issue.path)).toEqual([['identifiers', 0, 'unique']])
  })

  it.each([
    { label: 'an empty note', evidence: { source: 'sdef', note: '' } },
    { label: 'an unknown source', evidence: { source: 'guess', note: 'Why' } },
    { label: 'an unknown field', evidence: { source: 'sdef', note: 'Why', extra: 1 } },
  ])('rejects evidence with $label', ({ evidence }) => {
    expect(withIdentifier({ unique: true, evidence: { unique: evidence } }).success).toBe(false)
  })
})

describe('ResourceSchema range read marker', () => {
  /** What a live observation records of any range read: the app, build and time. */
  const OBSERVED = {
    source: 'probe',
    observedAt: '2026-11-03T17:58:53.000Z',
    bundleId: 'com.example.app',
    appVersion: '1.0',
    osVersion: '27.2',
  }
  /**
   * Evidence of a passing range read with its measured page costs: a page of
   * the default size took 600 ms by range and 90 ms by column, over a
   * collection of 300 items.
   */
  const PASSED = { ...OBSERVED, pageMs: 600, columnMs: 90, items: 300 }
  /** Evidence of a range read the app did not understand. */
  const FAILED = { ...OBSERVED, errorNumbers: [-1708] }

  /** A resource carrying `rangeRead`, and anything else in `extra`. */
  function withRangeRead(rangeRead: unknown, extra: Record<string, unknown> = {}) {
    return ResourceSchema.safeParse({
      name: 'Item',
      plural: 'Items',
      description: 'An item',
      properties: {},
      rangeRead,
      ...extra,
    })
  }

  /** The paths of the issues a failed parse reports. */
  function issuePaths(parsed: ReturnType<typeof withRangeRead>): PropertyKey[][] {
    return parsed.error?.issues.map((issue) => issue.path) ?? []
  }

  it('accepts a supported range read with its page read and measured costs', () => {
    const marker = { supported: true, read: 'column', evidence: { ...PASSED, note: 'Pages of 25' } }
    const parsed = withRangeRead(marker)

    expect(parsed.success).toBe(true)
    expect(parsed.data?.rangeRead).toEqual(marker)
  })

  it('accepts read: range when the range page was faster', () => {
    const parsed = withRangeRead({
      supported: true,
      read: 'range',
      evidence: { ...PASSED, pageMs: 450, columnMs: 4900, items: 332 },
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts read: range when both page reads took the same time', () => {
    // Range is the default; a tie never chooses column.
    const parsed = withRangeRead({
      supported: true,
      read: 'range',
      evidence: { ...PASSED, pageMs: 300, columnMs: 300, items: 1 },
    })

    expect(parsed.success).toBe(true)
  })

  describe('the column margin: column only when columnMs <= 0.75 x pageMs', () => {
    it('accepts read: column when the column page took exactly 0.75 of the range page', () => {
      const parsed = withRangeRead({
        supported: true,
        read: 'column',
        evidence: { ...PASSED, pageMs: 400, columnMs: 300 },
      })

      expect(parsed.success).toBe(true)
    })

    it('rejects read: column when the column page took just over 0.75 of the range page, at read', () => {
      const parsed = withRangeRead({
        supported: true,
        read: 'column',
        evidence: { ...PASSED, pageMs: 400, columnMs: 301 },
      })

      expect(parsed.success).toBe(false)
      expect(issuePaths(parsed)).toEqual([['rangeRead', 'read']])
    })

    it('accepts read: range when the column page was faster, but by less than the margin', () => {
      // A difference within live-measurement noise (Contacts emails measured
      // 272 ms by range and 263 ms by column) keeps the latency bound.
      const parsed = withRangeRead({
        supported: true,
        read: 'range',
        evidence: { ...PASSED, pageMs: 272, columnMs: 263, items: 3 },
      })

      expect(parsed.success).toBe(true)
    })

    it('rejects read: range when the column page took exactly 0.75 of the range page, at read', () => {
      const parsed = withRangeRead({
        supported: true,
        read: 'range',
        evidence: { ...PASSED, pageMs: 400, columnMs: 300 },
      })

      expect(parsed.success).toBe(false)
      expect(issuePaths(parsed)).toEqual([['rangeRead', 'read']])
    })
  })

  describe('pageReadFor', () => {
    it.each([
      [400, 300, 'column'],
      [400, 301, 'range'],
      [600, 90, 'column'],
      [300, 300, 'range'],
      [450, 4900, 'range'],
      [0, 0, 'range'],
      [1, 0, 'column'],
      [0, 1, 'range'],
    ] as const)('chooses for pageMs %d and columnMs %d: %s', (pageMs, columnMs, read) => {
      expect(pageReadFor(pageMs, columnMs)).toBe(read)
    })
  })

  it('accepts a failed range read with the error numbers it raised', () => {
    const parsed = withRangeRead({ supported: false, evidence: FAILED })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.rangeRead?.evidence.errorNumbers).toEqual([-1708])
  })

  it('accepts a resource that records no range read', () => {
    const parsed = ResourceSchema.safeParse({
      name: 'Item',
      plural: 'Items',
      description: 'An item',
      properties: {},
    })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.rangeRead).toBeUndefined()
  })

  it('rejects a supported range read with no page read, at read', () => {
    const parsed = withRangeRead({ supported: true, evidence: PASSED })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead', 'read']])
  })

  it.each(['pageMs', 'columnMs', 'items'] as const)(
    'rejects a supported range read with no evidence.%s, at the missing field',
    (field) => {
      const { [field]: _omitted, ...evidence } = PASSED
      const parsed = withRangeRead({ supported: true, read: 'column', evidence })

      expect(parsed.success).toBe(false)
      expect(issuePaths(parsed)).toEqual([['rangeRead', 'evidence', field]])
    }
  )

  it('rejects read: column when the column page was slower, at read', () => {
    const parsed = withRangeRead({
      supported: true,
      read: 'column',
      evidence: { ...PASSED, pageMs: 450, columnMs: 4900 },
    })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead', 'read']])
  })

  it('rejects read: range when the column page was faster by more than the margin, at read', () => {
    const parsed = withRangeRead({ supported: true, read: 'range', evidence: PASSED })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead', 'read']])
  })

  it('rejects a failed range read with no error numbers, at the missing numbers', () => {
    const parsed = withRangeRead({ supported: false, evidence: OBSERVED })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead', 'evidence', 'errorNumbers']])
  })

  it('rejects a supported range read whose evidence records failures, at the numbers', () => {
    const parsed = withRangeRead({
      supported: true,
      read: 'range',
      evidence: { ...FAILED, pageMs: 1, columnMs: 2, items: 3 },
    })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead', 'evidence', 'errorNumbers']])
  })

  it('rejects page costs on a failed range read, at each cost', () => {
    const parsed = withRangeRead({
      supported: false,
      evidence: { ...FAILED, pageMs: 1, columnMs: 2, items: 3 },
    })

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([
      ['rangeRead', 'evidence', 'pageMs'],
      ['rangeRead', 'evidence', 'columnMs'],
      ['rangeRead', 'evidence', 'items'],
    ])
  })

  it('rejects a page read on a failed range read', () => {
    expect(withRangeRead({ supported: false, read: 'range', evidence: FAILED }).success).toBe(false)
  })

  it('rejects a range read marked on a resource marked unsupported, at the marker', () => {
    const unsupported = {
      evidence: {
        source: 'live',
        observedAt: '2026-11-03T17:58:53.000Z',
        bundleId: 'com.example.app',
        appVersion: '1.0',
        osVersion: '27.2',
        expression: 'the items collection at the application',
        errorNumber: -1728,
      },
    }
    const parsed = withRangeRead(
      { supported: true, read: 'column', evidence: PASSED },
      { unsupported }
    )

    expect(parsed.success).toBe(false)
    expect(issuePaths(parsed)).toEqual([['rangeRead']])
  })

  it.each([
    { label: 'no evidence', marker: { supported: true, read: 'range' } },
    { label: 'no supported flag', marker: { read: 'column', evidence: PASSED } },
    {
      label: 'an unknown marker field',
      marker: { supported: true, read: 'column', evidence: PASSED, extra: 1 },
    },
    { label: 'an unknown page read', marker: { supported: true, read: 'whole', evidence: PASSED } },
    {
      label: 'a source other than a probe',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, source: 'sdef' } },
    },
    {
      label: 'a timestamp that is not ISO 8601 UTC',
      marker: {
        supported: true,
        read: 'column',
        evidence: { ...PASSED, observedAt: '3 Nov 2026' },
      },
    },
    {
      label: 'no app version',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, appVersion: undefined } },
    },
    {
      label: 'an empty bundle identifier',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, bundleId: '' } },
    },
    {
      label: 'no macOS version',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, osVersion: undefined } },
    },
    {
      label: 'a negative page time',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, pageMs: -1 } },
    },
    {
      label: 'a fractional column time',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, columnMs: 1.5 } },
    },
    {
      label: 'a page time that is not a number',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, pageMs: '600' } },
    },
    {
      label: 'a collection of no items',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, items: 0 } },
    },
    {
      label: 'a fractional collection size',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, items: 2.5 } },
    },
    {
      label: 'an empty list of error numbers',
      marker: { supported: false, evidence: { ...OBSERVED, errorNumbers: [] } },
    },
    {
      label: 'a repeated error number',
      marker: { supported: false, evidence: { ...OBSERVED, errorNumbers: [-1708, -1708] } },
    },
    {
      label: 'an error number that is not an integer',
      marker: { supported: false, evidence: { ...OBSERVED, errorNumbers: [-17.08] } },
    },
    {
      label: 'an empty note',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, note: '' } },
    },
    {
      label: 'an unknown evidence field',
      marker: { supported: true, read: 'column', evidence: { ...PASSED, sampleSize: 3 } },
    },
  ])('rejects a marker with $label', ({ marker }) => {
    expect(withRangeRead(marker).success).toBe(false)
  })
})

describe('ResourceSchema plural', () => {
  // A plural is Pascal case letters only, so its lower camel case is always a
  // valid route and permission segment (design record D2; issue #154).
  const withPlural = (plural: string) =>
    ResourceSchema.safeParse({ name: 'Item', plural, description: 'An item', properties: {} })

  it('accepts a multi-word plural', () => {
    expect(withPlural('MediaItems').success).toBe(true)
  })

  it('accepts a plural that starts with an acronym', () => {
    expect(withPlural('URLs').success).toBe(true)
    expect(withPlural('AIMHandles').success).toBe(true)
  })

  it('rejects a plural with a space, naming the expected form', () => {
    // `Bookmark Folders` would give the segment `bookmark Folders`.
    const result = withPlural('Bookmark Folders')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['plural'])
    expect(result.error?.issues[0]?.message).toContain('Pascal case identifier of letters only')
  })

  it('rejects a plural that starts with a lower-case letter', () => {
    expect(withPlural('calendars').success).toBe(false)
  })

  it('rejects a plural with a digit', () => {
    expect(withPlural('Mp3Files').success).toBe(false)
  })

  it('rejects an empty plural', () => {
    expect(withPlural('').success).toBe(false)
  })
})

describe('ResourceSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid resource', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar container',
        properties: {},
      })

      expect(result).toEqual({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar container',
        properties: {},
      })
    })

    it('should accept complete resource with all optional fields', () => {
      const result = ResourceSchema.parse({
        name: 'Event',
        plural: 'Events',
        description: 'A calendar event',
        schema: './schemas/event.json',
        code: 'wrev',
        properties: {
          summary: {
            access: 'rw',
            type: 'string',
            description: 'Event summary',
          },
        },
        identifiers: [
          {
            property: 'uid',
            primary: true,
          },
        ],
      })

      expect(result.name).toBe('Event')
      expect(result.schema).toBe('./schemas/event.json')
      expect(result.code).toBe('wrev')
      expect(result.identifiers).toHaveLength(1)
    })

    it('should accept resource with multiple identifiers', () => {
      const result = ResourceSchema.parse({
        name: 'Event',
        plural: 'Events',
        description: 'A calendar event',
        properties: {},
        identifiers: [{ property: 'uid', primary: true }, { property: 'id' }],
      })

      expect(result.identifiers).toHaveLength(2)
      expect(result.identifiers?.[0]?.primary).toBe(true)
      expect(result.identifiers?.[1]?.primary).toBe(false)
    })

    it('should accept resource with empty properties', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
      })

      expect(result.properties).toEqual({})
    })
  })

  describe('negative cases', () => {
    it('should reject resource without name', () => {
      expect(() =>
        ResourceSchema.parse({
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should reject resource without plural', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should reject resource without description', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should accept resource without properties (defaults to empty object)', () => {
      // Properties field uses z.preprocess to default to {} when missing
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
      })
      expect(result.properties).toEqual({})
    })

    it('should reject resource with invalid code length', () => {
      // Empty string should be rejected
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
          code: '',
        })
      ).toThrow(ZodError)

      // Too long (5+ chars) should be rejected
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
          code: 'abcde',
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with non-string name', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 123,
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with non-object properties', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          description: 'A calendar',
          properties: 'not-an-object',
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with non-array identifiers', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
          identifiers: 'not-an-array',
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with invalid identifier in array', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'Calendars',
          description: 'A calendar',
          properties: {},
          identifiers: [
            { property: 'uid', primary: true },
            { primary: true }, // missing property
          ],
        })
      ).toThrow(ZodError)
    })
  })

  describe('edge cases', () => {
    it('should accept code with 1-4 characters', () => {
      // 1 character
      let result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        code: 'a',
      })
      expect(result.code).toBe('a')

      // 2 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        code: 'ab',
      })
      expect(result.code).toBe('ab')

      // 3 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        code: 'abc',
      })
      expect(result.code).toBe('abc')

      // 4 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        code: 'abcd',
      })
      expect(result.code).toBe('abcd')
    })

    it('should accept empty string values', () => {
      // `plural` is the exception: it must be a non-empty Pascal case
      // identifier (see 'ResourceSchema plural').
      const result = ResourceSchema.parse({
        name: '',
        plural: 'Items',
        description: '',
        properties: {},
      })

      expect(result.name).toBe('')
      expect(result.description).toBe('')
    })

    it('should accept empty identifiers array', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        identifiers: [],
      })

      expect(result.identifiers).toEqual([])
    })

    it('should accept four-character code', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        code: 'wrcl',
      })

      expect(result.code).toBe('wrcl')
    })

    it('should accept undefined optional fields', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        schema: undefined,
        code: undefined,
        identifiers: undefined,
      })

      expect(result.schema).toBeUndefined()
      expect(result.code).toBeUndefined()
      expect(result.identifiers).toBeUndefined()
    })

    it('should accept a resource with probe metadata (probed status)', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        identifiers: [{ property: 'calendarIdentifier', primary: true }],
        probe: {
          status: 'probed',
          runtimeIdentifier: 'name',
          probedAt: '2024-03-15T10:00:00.000Z',
        },
      })

      expect(result.probe?.status).toBe('probed')
      expect(result.probe?.runtimeIdentifier).toBe('name')
      expect(result.probe?.probedAt).toBe('2024-03-15T10:00:00.000Z')
    })

    it('should accept a resource with probe metadata (no-items status)', () => {
      const result = ResourceSchema.parse({
        name: 'Event',
        plural: 'Events',
        description: 'A calendar event',
        properties: {},
        probe: {
          status: 'no-items',
          note: 'Collection was empty',
          probedAt: '2024-03-15T10:00:00.000Z',
        },
      })

      expect(result.probe?.status).toBe('no-items')
      expect(result.probe?.runtimeIdentifier).toBeUndefined()
      expect(result.probe?.note).toBe('Collection was empty')
    })

    it('should accept probe field as undefined', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {},
        probe: undefined,
      })

      expect(result.probe).toBeUndefined()
    })
  })
})

describe('ProbeStatusSchema', () => {
  describe('positive cases', () => {
    it('accepts probed', () => {
      expect(ProbeStatusSchema.parse('probed')).toBe('probed')
    })
    it('accepts no-items', () => {
      expect(ProbeStatusSchema.parse('no-items')).toBe('no-items')
    })
    it('accepts failed', () => {
      expect(ProbeStatusSchema.parse('failed')).toBe('failed')
    })
    it('accepts error', () => {
      expect(ProbeStatusSchema.parse('error')).toBe('error')
    })
  })

  describe('negative cases', () => {
    it('rejects unknown status string', () => {
      expect(() => ProbeStatusSchema.parse('unknown')).toThrow(ZodError)
    })

    it('rejects non-string', () => {
      expect(() => ProbeStatusSchema.parse(42)).toThrow(ZodError)
    })
  })
})

describe('RuntimeProbeSchema', () => {
  describe('positive cases', () => {
    it('accepts minimal valid probe with just status', () => {
      const result = RuntimeProbeSchema.parse({ status: 'probed' })
      expect(result.status).toBe('probed')
      expect(result.runtimeIdentifier).toBeUndefined()
    })

    it('accepts full probe with all fields', () => {
      const result = RuntimeProbeSchema.parse({
        status: 'probed',
        runtimeIdentifier: 'name',
        probedAt: '2024-03-15T10:00:00.000Z',
        note: 'Verified against Calendar app',
      })
      expect(result.runtimeIdentifier).toBe('name')
      expect(result.probedAt).toBe('2024-03-15T10:00:00.000Z')
      expect(result.note).toBe('Verified against Calendar app')
    })

    it('accepts probe with failed status and no runtimeIdentifier', () => {
      const result = RuntimeProbeSchema.parse({
        status: 'failed',
        probedAt: '2024-03-15T10:00:00.000Z',
        note: 'All candidates threw',
      })
      expect(result.status).toBe('failed')
      expect(result.runtimeIdentifier).toBeUndefined()
    })
  })

  describe('negative cases', () => {
    it('rejects probe without status', () => {
      expect(() => RuntimeProbeSchema.parse({ runtimeIdentifier: 'name' })).toThrow(ZodError)
    })

    it('rejects probe with invalid status', () => {
      expect(() => RuntimeProbeSchema.parse({ status: 'unknown' })).toThrow(ZodError)
    })

    it('rejects probe with non-string runtimeIdentifier', () => {
      expect(() => RuntimeProbeSchema.parse({ status: 'probed', runtimeIdentifier: 42 })).toThrow(
        ZodError
      )
    })
  })
})

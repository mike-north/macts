import { describe, it, expect } from 'vitest'
import { IdentifierSchema, IdentifierTargetingSchema, ResourceSchema } from './resource.js'
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

describe('ResourceSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid resource', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        properties: {},
      })

      expect(result).toEqual({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        properties: {},
      })
    })

    it('should accept complete resource with all optional fields', () => {
      const result = ResourceSchema.parse({
        name: 'Event',
        plural: 'events',
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
        plural: 'events',
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
        plural: 'calendars',
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
          plural: 'calendars',
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
          plural: 'calendars',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should accept resource without properties (defaults to empty object)', () => {
      // Properties field uses z.preprocess to default to {} when missing
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
      })
      expect(result.properties).toEqual({})
    })

    it('should reject resource with invalid code length', () => {
      // Empty string should be rejected
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
          code: '',
        })
      ).toThrow(ZodError)

      // Too long (5+ chars) should be rejected
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
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
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with non-object properties', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: 'not-an-object',
        })
      ).toThrow(ZodError)
    })

    it('should reject resource with non-array identifiers', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
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
          plural: 'calendars',
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
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'a',
      })
      expect(result.code).toBe('a')

      // 2 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'ab',
      })
      expect(result.code).toBe('ab')

      // 3 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'abc',
      })
      expect(result.code).toBe('abc')

      // 4 characters
      result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'abcd',
      })
      expect(result.code).toBe('abcd')
    })

    it('should accept empty string values', () => {
      const result = ResourceSchema.parse({
        name: '',
        plural: '',
        description: '',
        properties: {},
      })

      expect(result.name).toBe('')
      expect(result.plural).toBe('')
      expect(result.description).toBe('')
    })

    it('should accept empty identifiers array', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        identifiers: [],
      })

      expect(result.identifiers).toEqual([])
    })

    it('should accept four-character code', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'wrcl',
      })

      expect(result.code).toBe('wrcl')
    })

    it('should accept undefined optional fields', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
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
  })
})

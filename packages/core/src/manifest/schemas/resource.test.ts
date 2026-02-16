import { describe, it, expect } from 'vitest';
import { IdentifierSchema, ResourceSchema } from './resource.js';
import { ZodError } from 'zod';

describe('IdentifierSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid identifier', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
      });

      expect(result).toEqual({
        property: 'id',
        primary: false, // default value
      });
    });

    it('should accept identifier with primary flag', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
        primary: true,
      });

      expect(result).toEqual({
        property: 'id',
        primary: true,
      });
    });

    it('should accept identifier with explicit false primary', () => {
      const result = IdentifierSchema.parse({
        property: 'name',
        primary: false,
      });

      expect(result).toEqual({
        property: 'name',
        primary: false,
      });
    });
  });

  describe('negative cases', () => {
    it('should reject identifier without property', () => {
      expect(() =>
        IdentifierSchema.parse({
          primary: true,
        })
      ).toThrow(ZodError);
    });

    it('should reject identifier with non-string property', () => {
      expect(() =>
        IdentifierSchema.parse({
          property: 123,
          primary: true,
        })
      ).toThrow(ZodError);
    });

    it('should reject identifier with non-boolean primary', () => {
      expect(() =>
        IdentifierSchema.parse({
          property: 'id',
          primary: 'yes',
        })
      ).toThrow(ZodError);
    });

    it('should reject empty object', () => {
      expect(() => IdentifierSchema.parse({})).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string property', () => {
      const result = IdentifierSchema.parse({
        property: '',
      });

      expect(result.property).toBe('');
    });

    it('should handle extra properties by ignoring them', () => {
      const result = IdentifierSchema.parse({
        property: 'id',
        primary: true,
        extra: 'ignored',
      });

      // Zod strips unknown properties by default
      expect(result).toEqual({
        property: 'id',
        primary: true,
      });
    });
  });
});

describe('ResourceSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid resource', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        properties: {},
      });

      expect(result).toEqual({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        properties: {},
      });
    });

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
      });

      expect(result.name).toBe('Event');
      expect(result.schema).toBe('./schemas/event.json');
      expect(result.code).toBe('wrev');
      expect(result.identifiers).toHaveLength(1);
    });

    it('should accept resource with multiple identifiers', () => {
      const result = ResourceSchema.parse({
        name: 'Event',
        plural: 'events',
        description: 'A calendar event',
        properties: {},
        identifiers: [{ property: 'uid', primary: true }, { property: 'id' }],
      });

      expect(result.identifiers).toHaveLength(2);
      expect(result.identifiers?.[0]?.primary).toBe(true);
      expect(result.identifiers?.[1]?.primary).toBe(false);
    });

    it('should accept resource with empty properties', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
      });

      expect(result.properties).toEqual({});
    });
  });

  describe('negative cases', () => {
    it('should reject resource without name', () => {
      expect(() =>
        ResourceSchema.parse({
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError);
    });

    it('should reject resource without plural', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError);
    });

    it('should reject resource without description', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          properties: {},
        })
      ).toThrow(ZodError);
    });

    it('should reject resource without properties', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
        })
      ).toThrow(ZodError);
    });

    it('should reject resource with invalid code length', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
          code: 'abc', // too short
        })
      ).toThrow(ZodError);

      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
          code: 'abcde', // too long
        })
      ).toThrow(ZodError);
    });

    it('should reject resource with non-string name', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 123,
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
        })
      ).toThrow(ZodError);
    });

    it('should reject resource with non-object properties', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: 'not-an-object',
        })
      ).toThrow(ZodError);
    });

    it('should reject resource with non-array identifiers', () => {
      expect(() =>
        ResourceSchema.parse({
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
          identifiers: 'not-an-array',
        })
      ).toThrow(ZodError);
    });

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
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string values', () => {
      const result = ResourceSchema.parse({
        name: '',
        plural: '',
        description: '',
        properties: {},
      });

      expect(result.name).toBe('');
      expect(result.plural).toBe('');
      expect(result.description).toBe('');
    });

    it('should accept empty identifiers array', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        identifiers: [],
      });

      expect(result.identifiers).toEqual([]);
    });

    it('should accept four-character code', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        code: 'wrcl',
      });

      expect(result.code).toBe('wrcl');
    });

    it('should accept undefined optional fields', () => {
      const result = ResourceSchema.parse({
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
        schema: undefined,
        code: undefined,
        identifiers: undefined,
      });

      expect(result.schema).toBeUndefined();
      expect(result.code).toBeUndefined();
      expect(result.identifiers).toBeUndefined();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { EnumValueSchema, EnumSchema } from './enum.js';
import { ZodError } from 'zod';

describe('EnumValueSchema', () => {
  describe('positive cases', () => {
    it('should accept enum value with string value', () => {
      const result = EnumValueSchema.parse({
        name: 'Active',
        value: 'active',
      });

      expect(result).toEqual({
        name: 'Active',
        value: 'active',
      });
    });

    it('should accept enum value with number value', () => {
      const result = EnumValueSchema.parse({
        name: 'High',
        value: 1,
      });

      expect(result).toEqual({
        name: 'High',
        value: 1,
      });
    });

    it('should accept enum value with zero', () => {
      const result = EnumValueSchema.parse({
        name: 'None',
        value: 0,
      });

      expect(result.value).toBe(0);
    });

    it('should accept enum value with description', () => {
      const result = EnumValueSchema.parse({
        name: 'Active',
        value: 'active',
        description: 'The item is active',
      });

      expect(result.description).toBe('The item is active');
    });

    it('should accept enum value with code', () => {
      const result = EnumValueSchema.parse({
        name: 'Active',
        value: 'active',
        code: 'Eact',
      });

      expect(result.code).toBe('Eact');
    });

    it('should accept enum value with all optional fields', () => {
      const result = EnumValueSchema.parse({
        name: 'Active',
        value: 'active',
        description: 'The item is active',
        code: 'Eact',
      });

      expect(result).toEqual({
        name: 'Active',
        value: 'active',
        description: 'The item is active',
        code: 'Eact',
      });
    });
  });

  describe('negative cases', () => {
    it('should reject enum value without name', () => {
      expect(() =>
        EnumValueSchema.parse({
          value: 'active',
        })
      ).toThrow(ZodError);
    });

    it('should reject enum value without value', () => {
      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
        })
      ).toThrow(ZodError);
    });

    it('should reject enum value with boolean value', () => {
      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
          value: true,
        })
      ).toThrow(ZodError);
    });

    it('should reject enum value with object value', () => {
      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
          value: { status: 'active' },
        })
      ).toThrow(ZodError);
    });

    it('should reject enum value with array value', () => {
      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
          value: ['active'],
        })
      ).toThrow(ZodError);
    });

    it('should reject enum value with invalid code length', () => {
      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
          value: 'active',
          code: 'abc', // too short
        })
      ).toThrow(ZodError);

      expect(() =>
        EnumValueSchema.parse({
          name: 'Active',
          value: 'active',
          code: 'abcde', // too long
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string name', () => {
      const result = EnumValueSchema.parse({
        name: '',
        value: 'active',
      });

      expect(result.name).toBe('');
    });

    it('should accept empty string value', () => {
      const result = EnumValueSchema.parse({
        name: 'Empty',
        value: '',
      });

      expect(result.value).toBe('');
    });

    it('should accept negative number value', () => {
      const result = EnumValueSchema.parse({
        name: 'Negative',
        value: -1,
      });

      expect(result.value).toBe(-1);
    });

    it('should accept floating point number value', () => {
      const result = EnumValueSchema.parse({
        name: 'Half',
        value: 0.5,
      });

      expect(result.value).toBe(0.5);
    });
  });
});

describe('EnumSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid enum', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        values: [{ name: 'Active', value: 'active' }],
      });

      expect(result).toEqual({
        name: 'Status',
        values: [{ name: 'Active', value: 'active' }],
      });
    });

    it('should accept enum with multiple values', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        values: [
          { name: 'Active', value: 'active' },
          { name: 'Inactive', value: 'inactive' },
          { name: 'Pending', value: 'pending' },
        ],
      });

      expect(result.values).toHaveLength(3);
    });

    it('should accept enum with description', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        description: 'The status of an item',
        values: [{ name: 'Active', value: 'active' }],
      });

      expect(result.description).toBe('The status of an item');
    });

    it('should accept enum with code', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        code: 'enum',
        values: [{ name: 'Active', value: 'active' }],
      });

      expect(result.code).toBe('enum');
    });

    it('should accept enum with all optional fields', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        description: 'The status of an item',
        code: 'enum',
        values: [
          {
            name: 'Active',
            value: 'active',
            description: 'Item is active',
            code: 'Eact',
          },
        ],
      });

      expect(result).toEqual({
        name: 'Status',
        description: 'The status of an item',
        code: 'enum',
        values: [
          {
            name: 'Active',
            value: 'active',
            description: 'Item is active',
            code: 'Eact',
          },
        ],
      });
    });

    it('should accept enum with mixed string and number values', () => {
      const result = EnumSchema.parse({
        name: 'Priority',
        values: [
          { name: 'None', value: 0 },
          { name: 'Low', value: 'low' },
          { name: 'High', value: 1 },
        ],
      });

      expect(result.values[0]?.value).toBe(0);
      expect(result.values[1]?.value).toBe('low');
      expect(result.values[2]?.value).toBe(1);
    });
  });

  describe('negative cases', () => {
    it('should reject enum without name', () => {
      expect(() =>
        EnumSchema.parse({
          values: [{ name: 'Active', value: 'active' }],
        })
      ).toThrow(ZodError);
    });

    it('should reject enum without values', () => {
      expect(() =>
        EnumSchema.parse({
          name: 'Status',
        })
      ).toThrow(ZodError);
    });

    it('should reject enum with empty values array', () => {
      expect(() =>
        EnumSchema.parse({
          name: 'Status',
          values: [],
        })
      ).toThrow(ZodError);
    });

    it('should reject enum with non-string name', () => {
      expect(() =>
        EnumSchema.parse({
          name: 123,
          values: [{ name: 'Active', value: 'active' }],
        })
      ).toThrow(ZodError);
    });

    it('should reject enum with non-array values', () => {
      expect(() =>
        EnumSchema.parse({
          name: 'Status',
          values: 'not-an-array',
        })
      ).toThrow(ZodError);
    });

    it('should reject enum with invalid value in array', () => {
      expect(() =>
        EnumSchema.parse({
          name: 'Status',
          values: [
            { name: 'Active', value: 'active' },
            { name: 'Invalid' }, // missing value
          ],
        })
      ).toThrow(ZodError);
    });

    it('should reject enum with invalid code length', () => {
      expect(() =>
        EnumSchema.parse({
          name: 'Status',
          code: 'abc', // too short
          values: [{ name: 'Active', value: 'active' }],
        })
      ).toThrow(ZodError);

      expect(() =>
        EnumSchema.parse({
          name: 'Status',
          code: 'abcde', // too long
          values: [{ name: 'Active', value: 'active' }],
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string name', () => {
      const result = EnumSchema.parse({
        name: '',
        values: [{ name: 'Active', value: 'active' }],
      });

      expect(result.name).toBe('');
    });

    it('should accept single value enum', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        values: [{ name: 'OnlyValue', value: 'only' }],
      });

      expect(result.values).toHaveLength(1);
    });

    it('should accept undefined optional fields', () => {
      const result = EnumSchema.parse({
        name: 'Status',
        description: undefined,
        code: undefined,
        values: [{ name: 'Active', value: 'active' }],
      });

      expect(result.description).toBeUndefined();
      expect(result.code).toBeUndefined();
    });

    it('should handle values with duplicate names', () => {
      // Zod does not enforce uniqueness, so this should pass
      const result = EnumSchema.parse({
        name: 'Status',
        values: [
          { name: 'Active', value: 'active1' },
          { name: 'Active', value: 'active2' },
        ],
      });

      expect(result.values).toHaveLength(2);
    });

    it('should handle values with duplicate values', () => {
      // Zod does not enforce uniqueness, so this should pass
      const result = EnumSchema.parse({
        name: 'Status',
        values: [
          { name: 'Active1', value: 'active' },
          { name: 'Active2', value: 'active' },
        ],
      });

      expect(result.values).toHaveLength(2);
    });
  });
});

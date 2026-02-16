import { describe, it, expect } from 'vitest';
import { InheritanceSchema } from './inheritance.js';
import { ZodError } from 'zod';

describe('InheritanceSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid inheritance', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {},
        },
      });

      expect(result).toEqual({
        discriminator: 'type',
        abstract: false, // default value
        variants: {
          display: {},
        },
      });
    });

    it('should accept inheritance with abstract flag', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        abstract: true,
        variants: {
          display: {},
        },
      });

      expect(result.abstract).toBe(true);
    });

    it('should accept inheritance with explicit false abstract', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        abstract: false,
        variants: {
          display: {},
        },
      });

      expect(result.abstract).toBe(false);
    });

    it('should accept variant with description', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: 'A display alarm',
          },
        },
      });

      expect(result.variants['display']?.description).toBe('A display alarm');
    });

    it('should accept variant with properties', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            properties: {
              message: { type: 'string' },
            },
          },
        },
      });

      expect(result.variants['display']?.properties).toEqual({
        message: { type: 'string' },
      });
    });

    it('should accept variant with both description and properties', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: 'A display alarm',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      });

      expect(result.variants['display']).toEqual({
        description: 'A display alarm',
        properties: {
          message: { type: 'string' },
        },
      });
    });

    it('should accept multiple variants', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: 'A display alarm',
          },
          sound: {
            description: 'A sound alarm',
          },
          email: {
            description: 'An email alarm',
          },
        },
      });

      expect(Object.keys(result.variants)).toHaveLength(3);
      expect(result.variants['display']?.description).toBe('A display alarm');
      expect(result.variants['sound']?.description).toBe('A sound alarm');
      expect(result.variants['email']?.description).toBe('An email alarm');
    });

    it('should accept complex variant properties', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'alarmType',
        variants: {
          sound: {
            properties: {
              soundFile: { type: 'string' },
              volume: { type: 'number' },
              repeat: { type: 'boolean' },
            },
          },
        },
      });

      expect(result.variants['sound']?.properties).toEqual({
        soundFile: { type: 'string' },
        volume: { type: 'number' },
        repeat: { type: 'boolean' },
      });
    });

    it('should accept nested property structures', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          complex: {
            properties: {
              nested: {
                properties: {
                  deep: { type: 'string' },
                },
              },
            },
          },
        },
      });

      expect(result.variants['complex']?.properties).toBeDefined();
    });
  });

  describe('negative cases', () => {
    it('should reject inheritance without discriminator', () => {
      expect(() =>
        InheritanceSchema.parse({
          variants: {
            display: {},
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject inheritance without variants', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
        })
      ).toThrow(ZodError);
    });

    it('should reject inheritance with non-string discriminator', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 123,
          variants: {
            display: {},
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject inheritance with non-boolean abstract', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          abstract: 'yes',
          variants: {
            display: {},
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject inheritance with non-object variants', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: 'not-an-object',
        })
      ).toThrow(ZodError);
    });

    it('should reject inheritance with array variants', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: [{ display: {} }],
        })
      ).toThrow(ZodError);
    });

    it('should reject variant with non-object value', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: {
            display: 'not-an-object',
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject variant with non-object properties', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: {
            display: {
              properties: 'not-an-object',
            },
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject variant with array properties', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: {
            display: {
              properties: ['array'],
            },
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject variant with non-string description', () => {
      expect(() =>
        InheritanceSchema.parse({
          discriminator: 'type',
          variants: {
            display: {
              description: 123,
            },
          },
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string discriminator', () => {
      const result = InheritanceSchema.parse({
        discriminator: '',
        variants: {
          display: {},
        },
      });

      expect(result.discriminator).toBe('');
    });

    it('should accept empty variants object', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {},
      });

      expect(result.variants).toEqual({});
    });

    it('should accept variant with empty properties', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            properties: {},
          },
        },
      });

      expect(result.variants['display']?.properties).toEqual({});
    });

    it('should accept variant with empty string description', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: '',
          },
        },
      });

      expect(result.variants['display']?.description).toBe('');
    });

    it('should accept undefined optional fields in variant', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: undefined,
            properties: undefined,
          },
        },
      });

      expect(result.variants['display']?.description).toBeUndefined();
      expect(result.variants['display']?.properties).toBeUndefined();
    });

    it('should accept variant with only description', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            description: 'Display only',
          },
        },
      });

      expect(result.variants['display']?.properties).toBeUndefined();
    });

    it('should accept variant with only properties', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          display: {
            properties: { msg: { type: 'string' } },
          },
        },
      });

      expect(result.variants['display']?.description).toBeUndefined();
    });

    it('should handle variant keys with special characters', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          'display-alarm': {},
          sound_alarm: {},
          'email.alarm': {},
        },
      });

      expect(Object.keys(result.variants)).toHaveLength(3);
    });

    it('should accept single variant', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        variants: {
          only: {},
        },
      });

      expect(Object.keys(result.variants)).toHaveLength(1);
    });

    it('should handle extra properties by ignoring them', () => {
      const result = InheritanceSchema.parse({
        discriminator: 'type',
        abstract: false,
        variants: {
          display: {},
        },
        extra: 'ignored',
      });

      // Zod strips unknown properties by default
      expect(result).toEqual({
        discriminator: 'type',
        abstract: false,
        variants: {
          display: {},
        },
      });
    });
  });
});

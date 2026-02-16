import { describe, it, expect } from 'vitest';
import {
  PropertyAccessSchema,
  PrimitiveTypeSchema,
  PropertyTypeSchema,
  PropertySchema,
  type Property,
} from './property.js';

describe('PropertyAccessSchema', () => {
  it('should accept read-only access mode', () => {
    const result = PropertyAccessSchema.safeParse('r');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('r');
    }
  });

  it('should accept read-write access mode', () => {
    const result = PropertyAccessSchema.safeParse('rw');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('rw');
    }
  });

  // Negative tests
  it('should reject invalid access mode', () => {
    const result = PropertyAccessSchema.safeParse('w');
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = PropertyAccessSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(PropertyAccessSchema.safeParse(123).success).toBe(false);
    expect(PropertyAccessSchema.safeParse(null).success).toBe(false);
    expect(PropertyAccessSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('PrimitiveTypeSchema', () => {
  const validTypes = [
    'string',
    'number',
    'integer',
    'boolean',
    'date',
    'data',
    'any',
    'file',
    'point',
    'rect',
    'rgb',
  ];

  validTypes.forEach((type) => {
    it(`should accept primitive type: ${type}`, () => {
      const result = PrimitiveTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  // Negative tests
  it('should reject invalid primitive type', () => {
    const result = PrimitiveTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = PrimitiveTypeSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(PrimitiveTypeSchema.safeParse(123).success).toBe(false);
    expect(PrimitiveTypeSchema.safeParse(null).success).toBe(false);
    expect(PrimitiveTypeSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('PropertyTypeSchema', () => {
  // Positive tests
  it('should accept primitive type', () => {
    const result = PropertyTypeSchema.safeParse('string');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('string');
    }
  });

  it('should accept array type with primitive element', () => {
    const result = PropertyTypeSchema.safeParse({ array: 'string' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ array: 'string' });
    }
  });

  it('should accept nested array type', () => {
    const result = PropertyTypeSchema.safeParse({
      array: { array: 'number' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ array: { array: 'number' } });
    }
  });

  it('should accept resource reference', () => {
    const result = PropertyTypeSchema.safeParse({ resource: 'Document' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ resource: 'Document' });
    }
  });

  it('should accept enum reference', () => {
    const result = PropertyTypeSchema.safeParse({ enum: 'SaveOptions' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ enum: 'SaveOptions' });
    }
  });

  it('should accept array of resource references', () => {
    const result = PropertyTypeSchema.safeParse({
      array: { resource: 'Window' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ array: { resource: 'Window' } });
    }
  });

  // Negative tests
  it('should reject invalid primitive type', () => {
    const result = PropertyTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should reject array with missing element type', () => {
    const result = PropertyTypeSchema.safeParse({ array: undefined });
    expect(result.success).toBe(false);
  });

  it('should reject resource reference with empty string', () => {
    const result = PropertyTypeSchema.safeParse({ resource: '' });
    expect(result.success).toBe(false);
  });

  it('should reject enum reference with non-string', () => {
    const result = PropertyTypeSchema.safeParse({ enum: 123 });
    expect(result.success).toBe(false);
  });

  it('should reject object with multiple type keys', () => {
    const result = PropertyTypeSchema.safeParse({
      resource: 'Document',
      enum: 'SaveOptions',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = PropertyTypeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('PropertySchema', () => {
  // Positive tests
  it('should accept property with minimal required fields', () => {
    const property = {
      access: 'r' as const,
      description: 'The document title',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.access).toBe('r');
      expect(result.data.description).toBe('The document title');
      expect(result.data.optional).toBe(false);
    }
  });

  it('should accept property with all fields', () => {
    const property: Property = {
      access: 'rw',
      type: 'string',
      description: 'The document name',
      code: 'pnam',
      default: 'Untitled',
      optional: true,
      deprecated: {
        message: 'Use title instead',
        since: '1.5.0',
      },
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(property);
    }
  });

  it('should accept property with array type', () => {
    const property = {
      access: 'r' as const,
      type: { array: 'string' as const },
      description: 'List of tags',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toEqual({ array: 'string' });
    }
  });

  it('should accept property with resource reference', () => {
    const property = {
      access: 'r' as const,
      type: { resource: 'Window' },
      description: 'The front window',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toEqual({ resource: 'Window' });
    }
  });

  it('should accept property with enum reference', () => {
    const property = {
      access: 'rw' as const,
      type: { enum: 'SaveOptions' },
      description: 'Save behavior',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toEqual({ enum: 'SaveOptions' });
    }
  });

  it('should apply default value for optional field', () => {
    const property = {
      access: 'r',
      description: 'Test property',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optional).toBe(false);
    }
  });

  it('should accept deprecation without since field', () => {
    const property = {
      access: 'r' as const,
      description: 'Old property',
      deprecated: {
        message: 'No longer supported',
      },
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deprecated?.message).toBe('No longer supported');
      expect(result.data.deprecated?.since).toBeUndefined();
    }
  });

  it('should accept property with complex nested array type', () => {
    const property = {
      access: 'r' as const,
      type: { array: { resource: 'Document' } },
      description: 'All documents',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toEqual({ array: { resource: 'Document' } });
    }
  });

  // Negative tests
  it('should reject property missing access field', () => {
    const property = {
      description: 'Test property',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property missing description field', () => {
    const property = {
      access: 'r',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with invalid access mode', () => {
    const property = {
      access: 'w',
      description: 'Test property',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with code not 4 characters', () => {
    const property = {
      access: 'r',
      description: 'Test property',
      code: 'abc',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with code longer than 4 characters', () => {
    const property = {
      access: 'r',
      description: 'Test property',
      code: 'abcde',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with invalid type', () => {
    const property = {
      access: 'r',
      type: 'invalid',
      description: 'Test property',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with empty description', () => {
    const property = {
      access: 'r',
      description: '',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with optional as non-boolean', () => {
    const property = {
      access: 'r',
      description: 'Test property',
      optional: 'yes',
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject deprecated without message', () => {
    const property = {
      access: 'r',
      description: 'Test property',
      deprecated: {
        since: '1.0.0',
      },
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject deprecated with empty message', () => {
    const property = {
      access: 'r',
      description: 'Test property',
      deprecated: {
        message: '',
      },
    };
    const result = PropertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });
});

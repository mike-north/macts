import { describe, it, expect } from 'vitest';
import {
  DateTypeSchema,
  DurationTypeSchema,
  ColorTypeSchema,
  PathTypeSchema,
  PointTypeSchema,
  RectTypeSchema,
  RgbTypeSchema,
} from './standardized.js';

describe('DateTypeSchema', () => {
  it('should accept Date object', () => {
    const result = DateTypeSchema.parse(new Date());
    expect(result).toBeInstanceOf(Date);
  });

  it('should accept ISO datetime string', () => {
    const result = DateTypeSchema.parse('2024-01-15T10:30:00Z');
    expect(typeof result).toBe('string');
  });

  it('should reject invalid strings', () => {
    expect(() => DateTypeSchema.parse('not-a-date')).toThrow();
  });
});

describe('DurationTypeSchema', () => {
  it('should accept hour duration', () => {
    expect(DurationTypeSchema.parse('PT1H')).toBe('PT1H');
  });

  it('should accept day duration', () => {
    expect(DurationTypeSchema.parse('P1D')).toBe('P1D');
  });

  it('should accept complex duration', () => {
    expect(DurationTypeSchema.parse('P1DT2H30M')).toBe('P1DT2H30M');
  });

  it('should reject invalid format', () => {
    expect(() => DurationTypeSchema.parse('1 hour')).toThrow();
  });
});

describe('ColorTypeSchema', () => {
  it('should accept valid hex color', () => {
    expect(ColorTypeSchema.parse('#FF0000')).toBe('#FF0000');
  });

  it('should accept lowercase hex', () => {
    expect(ColorTypeSchema.parse('#ff0000')).toBe('#ff0000');
  });

  it('should reject without hash', () => {
    expect(() => ColorTypeSchema.parse('FF0000')).toThrow();
  });

  it('should reject short hex', () => {
    expect(() => ColorTypeSchema.parse('#FFF')).toThrow();
  });
});

describe('PathTypeSchema', () => {
  it('should accept valid path', () => {
    expect(PathTypeSchema.parse('/Users/test')).toBe('/Users/test');
  });

  it('should reject empty string', () => {
    expect(() => PathTypeSchema.parse('')).toThrow();
  });
});

describe('PointTypeSchema', () => {
  it('should accept valid point', () => {
    const result = PointTypeSchema.parse({ x: 100, y: 200 });
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('should reject missing coordinate', () => {
    expect(() => PointTypeSchema.parse({ x: 100 })).toThrow();
  });
});

describe('RectTypeSchema', () => {
  it('should accept valid rect', () => {
    const result = RectTypeSchema.parse({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
    expect(result.width).toBe(100);
  });
});

describe('RgbTypeSchema', () => {
  it('should accept valid RGB', () => {
    const result = RgbTypeSchema.parse({ r: 255, g: 128, b: 0 });
    expect(result).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('should reject out of range values', () => {
    expect(() => RgbTypeSchema.parse({ r: 256, g: 0, b: 0 })).toThrow();
    expect(() => RgbTypeSchema.parse({ r: -1, g: 0, b: 0 })).toThrow();
  });
});

import { z } from 'zod';

/**
 * Type coercer interface - converts between TypeScript and JXA.
 */
export interface TypeCoercer<T> {
  /** Convert TypeScript value to JXA code string */
  toJxa(value: T): string;
  /** Convert JXA result to TypeScript value */
  fromJxa(value: unknown): T;
}

// ============== Date Coercion ==============

/**
 * Coerce dates between TypeScript Date and JXA.
 * JXA handles dates as JavaScript Date objects.
 */
export const dateCoercer: TypeCoercer<Date> = {
  toJxa(date: Date): string {
    return `new Date("${date.toISOString()}")`;
  },
  fromJxa(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error(`Cannot coerce ${typeof value} to Date`);
  },
};

// ============== Color Coercion ==============

/**
 * Hex color schema.
 */
export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export type HexColor = z.infer<typeof HexColorSchema>;

/**
 * Coerce colors between hex strings and AppleScript RGB.
 * AppleScript uses 16-bit color values (0-65535).
 */
export const colorCoercer: TypeCoercer<HexColor> = {
  toJxa(hex: HexColor): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Convert 8-bit to 16-bit (multiply by 257)
    return `[${String(r * 257)}, ${String(g * 257)}, ${String(b * 257)}]`;
  },
  fromJxa(value: unknown): HexColor {
    if (!Array.isArray(value) || value.length !== 3) {
      throw new Error('Expected RGB array for color');
    }
    const [r, g, b] = value as number[];
    // Convert 16-bit to 8-bit (divide by 257)
    const toHex = (v: number) =>
      Math.round(v / 257)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r ?? 0)}${toHex(g ?? 0)}${toHex(b ?? 0)}`;
  },
};

// ============== Enum Coercion ==============

/**
 * Enum value for JXA coercion (name and four-char code).
 */
export interface JxaEnumValue {
  name: string;
  code: string;
}

/**
 * Create an enum coercer from enum definition.
 */
export function createEnumCoercer(values: JxaEnumValue[]): TypeCoercer<string> {
  const byName = new Map(values.map((v) => [v.name, v.code]));
  const byCode = new Map(values.map((v) => [v.code, v.name]));

  return {
    toJxa(name: string): string {
      const code = byName.get(name);
      if (!code) {
        throw new Error(`Unknown enum value: ${name}`);
      }
      // AppleScript enums use four-character codes
      return `"${code}"`;
    },
    fromJxa(value: unknown): string {
      if (typeof value !== 'string') {
        throw new Error(`Expected string for enum, got ${typeof value}`);
      }
      const name = byCode.get(value);
      if (!name) {
        throw new Error(`Unknown enum code: ${value}`);
      }
      return name;
    },
  };
}

// ============== Path Coercion ==============

/**
 * Coerce paths between POSIX and AppleScript Path format.
 */
export const pathCoercer: TypeCoercer<string> = {
  toJxa(posixPath: string): string {
    return `Path("${posixPath}")`;
  },
  fromJxa(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error(`Expected string path, got ${typeof value}`);
    }
    // AppleScript paths may be in various formats, normalize to POSIX
    return value.replace(/:/g, '/');
  },
};

// ============== Boolean Coercion ==============

/**
 * Coerce booleans - JXA uses JavaScript booleans.
 */
export const booleanCoercer: TypeCoercer<boolean> = {
  toJxa(value: boolean): string {
    return value ? 'true' : 'false';
  },
  fromJxa(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`Cannot coerce ${typeof value} to boolean`);
  },
};

// ============== Number Coercion ==============

/**
 * Coerce numbers - straightforward conversion.
 */
export const numberCoercer: TypeCoercer<number> = {
  toJxa(value: number): string {
    return String(value);
  },
  fromJxa(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = parseFloat(value);
      if (!isNaN(n)) return n;
    }
    throw new Error(`Cannot coerce ${typeof value} to number`);
  },
};

// ============== String Coercion ==============

/**
 * Coerce strings with proper escaping for JXA.
 */
export const stringCoercer: TypeCoercer<string> = {
  toJxa(value: string): string {
    return JSON.stringify(value);
  },
  fromJxa(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    // For primitives (numbers, booleans), explicit String conversion is safe
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // For objects, use JSON serialization to avoid meaningless [object Object]
    return JSON.stringify(value);
  },
};

// ============== Array Coercion ==============

/**
 * Create an array coercer from element coercer.
 */
export function createArrayCoercer<T>(elementCoercer: TypeCoercer<T>): TypeCoercer<T[]> {
  return {
    toJxa(values: T[]): string {
      const elements = values.map((v) => elementCoercer.toJxa(v)).join(', ');
      return `[${elements}]`;
    },
    fromJxa(value: unknown): T[] {
      if (!Array.isArray(value)) {
        throw new Error('Expected array');
      }
      return value.map((v) => elementCoercer.fromJxa(v));
    },
  };
}

// ============== Null-safe Wrapper ==============

/**
 * Wrap a coercer to handle null/undefined values.
 */
export function nullSafe<T>(coercer: TypeCoercer<T>): TypeCoercer<T | null | undefined> {
  return {
    toJxa(value: T | null | undefined): string {
      if (value === null || value === undefined) {
        return 'null';
      }
      return coercer.toJxa(value);
    },
    fromJxa(value: unknown): T | null | undefined {
      if (value === null || value === undefined) {
        return value;
      }
      return coercer.fromJxa(value);
    },
  };
}

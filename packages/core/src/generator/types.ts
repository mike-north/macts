import type { GeneratorContext } from './context.js';
import type { Resource, PropertyType, Enum } from '../manifest/index.js';

export interface GeneratedType {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Map of primitive type names to their TypeScript representations.
 */
const PRIMITIVE_TYPE_MAP: Record<string, string> = {
  string: 'string',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
  date: 'Date',
  data: 'ArrayBuffer',
  file: 'string', // Path
  any: 'unknown',
  point: '{ x: number; y: number }',
  rect: '{ x: number; y: number; width: number; height: number }',
  rgb: '{ r: number; g: number; b: number }',
};

/**
 * Convert manifest property type to TypeScript type string.
 *
 * Handles three categories of types:
 * - Primitive types (string, number, boolean, date, etc.)
 * - Complex types (arrays, resource references, enum references)
 * - Custom type references (arbitrary strings referencing resources/enums)
 *
 * @param type - The property type from the manifest, or undefined
 * @returns TypeScript type string representation
 *
 * @example
 * ```typescript
 * propertyTypeToTs('string')           // => 'string'
 * propertyTypeToTs({ array: 'number' }) // => 'number[]'
 * propertyTypeToTs({ resource: 'Event' }) // => 'Event'
 * propertyTypeToTs('Calendar')         // => 'Calendar' (custom reference)
 * ```
 */
export function propertyTypeToTs(type: PropertyType | undefined): string {
  if (!type) return 'unknown';

  if (typeof type === 'string') {
    // Check if it's a known primitive type
    const mapped = PRIMITIVE_TYPE_MAP[type];
    if (mapped) return mapped;
    // Otherwise treat as custom type reference (resource or enum name)
    return type;
  }

  if ('array' in type) {
    const elementType = propertyTypeToTs(type.array);
    return `${elementType}[]`;
  }

  if ('enum' in type) {
    return type.enum;
  }

  if ('resource' in type) {
    return type.resource;
  }

  return 'unknown';
}

/**
 * Generate TypeScript interface for reading a resource.
 *
 * Creates an interface containing all properties from the resource definition,
 * with read-only properties marked with the `readonly` modifier.
 *
 * @param resource - The resource definition from the manifest
 * @param _ctx - Generator context (unused but maintained for API consistency)
 * @returns Generated type with interface definition
 *
 * @example
 * ```typescript
 * // For a Calendar resource with name (rw) and uid (r) properties:
 * // Generates:
 * // export interface Calendar {
 * //   name: string;
 * //   readonly uid: string;
 * // }
 * ```
 */
export function generateReadType(resource: Resource, _ctx: GeneratorContext): GeneratedType {
  const properties = Object.entries(resource.properties);
  const imports: string[] = [];

  const propLines = properties.map(([name, prop]) => {
    const tsType = propertyTypeToTs(prop.type);
    const optional = prop.optional ? '?' : '';
    const readonly = prop.access === 'r' ? 'readonly ' : '';
    return `  ${readonly}${name}${optional}: ${tsType};`;
  });

  const content = `export interface ${resource.name} {\n${propLines.join('\n')}\n}`;

  return { name: resource.name, content, imports };
}

/**
 * Generate TypeScript interface for creating a resource.
 *
 * Creates an interface containing only writable properties. Properties are
 * marked optional if they have a default value or are explicitly optional.
 *
 * @param resource - The resource definition from the manifest
 * @param _ctx - Generator context (unused but maintained for API consistency)
 * @returns Generated type with create input interface
 *
 * @example
 * ```typescript
 * // For a Calendar resource with name (rw, required) and color (rw, optional):
 * // Generates:
 * // export interface CalendarCreateInput {
 * //   name: string;
 * //   color?: string;
 * // }
 * ```
 */
export function generateCreateInputType(resource: Resource, _ctx: GeneratorContext): GeneratedType {
  const properties = Object.entries(resource.properties);
  const imports: string[] = [];

  // Only include writable properties
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw');

  const propLines = writableProps.map(([name, prop]) => {
    const tsType = propertyTypeToTs(prop.type);
    // Required unless optional or has default
    const optional = prop.optional || prop.default !== undefined ? '?' : '';
    return `  ${name}${optional}: ${tsType};`;
  });

  const typeName = `${resource.name}CreateInput`;
  const content = `export interface ${typeName} {\n${propLines.join('\n')}\n}`;

  return { name: typeName, content, imports };
}

/**
 * Generate TypeScript interface for updating a resource.
 *
 * Creates an interface containing only writable properties, with all
 * properties marked as optional (partial update semantics).
 *
 * @param resource - The resource definition from the manifest
 * @param _ctx - Generator context (unused but maintained for API consistency)
 * @returns Generated type with update input interface
 *
 * @example
 * ```typescript
 * // For a Calendar resource with name (rw) and color (rw):
 * // Generates:
 * // export interface CalendarUpdateInput {
 * //   name?: string;
 * //   color?: string;
 * // }
 * ```
 */
export function generateUpdateInputType(resource: Resource, _ctx: GeneratorContext): GeneratedType {
  const properties = Object.entries(resource.properties);
  const imports: string[] = [];

  // Only include writable properties, all optional
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw');

  const propLines = writableProps.map(([name, prop]) => {
    const tsType = propertyTypeToTs(prop.type);
    return `  ${name}?: ${tsType};`;
  });

  const typeName = `${resource.name}UpdateInput`;
  const content = `export interface ${typeName} {\n${propLines.join('\n')}\n}`;

  return { name: typeName, content, imports };
}

/**
 * Generate TypeScript type alias for an enum as a string literal union.
 *
 * @param enumDef - The enum definition from the manifest
 * @returns Generated type with string literal union
 *
 * @example
 * ```typescript
 * // For an enum with values 'active' and 'inactive':
 * // Generates:
 * // export type Status = 'active' | 'inactive';
 * ```
 */
export function generateEnumType(enumDef: Enum): GeneratedType {
  const values = enumDef.values.map((v: { name: string }) => `'${v.name}'`).join(' | ');
  const content = `export type ${enumDef.name} = ${values};`;

  return { name: enumDef.name, content, imports: [] };
}

/**
 * Generate all TypeScript types for a generator context.
 *
 * Produces three types per resource (read, create input, update input) plus
 * one type per enum. Types are generated in a consistent order: resources
 * first (with their variants), then enums.
 *
 * @param ctx - Generator context containing the manifest and options
 * @returns Array of generated types
 */
export function generateTypes(ctx: GeneratorContext): GeneratedType[] {
  const types: GeneratedType[] = [];

  // Generate resource types
  for (const resource of ctx.getResources()) {
    types.push(generateReadType(resource, ctx));
    types.push(generateCreateInputType(resource, ctx));
    types.push(generateUpdateInputType(resource, ctx));
  }

  // Generate enum types
  for (const enumDef of ctx.getEnums()) {
    types.push(generateEnumType(enumDef));
  }

  return types;
}

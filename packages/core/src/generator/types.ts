import type { GeneratorContext } from './context.js';
import type { Resource, PropertyType, Enum } from '../manifest/index.js';

export interface GeneratedType {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Convert manifest property type to TypeScript type string.
 * Accepts PropertyType union or plain strings (for command parameter types).
 */
export function propertyTypeToTs(type: PropertyType | string | undefined): string {
  if (!type) return 'unknown';

  if (typeof type === 'string') {
    // Primitive types
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'integer': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'Date';
      case 'data': return 'ArrayBuffer';
      case 'file': return 'string'; // Path
      case 'any': return 'unknown';
      case 'point': return '{ x: number; y: number }';
      case 'rect': return '{ x: number; y: number; width: number; height: number }';
      case 'rgb': return '{ r: number; g: number; b: number }';
      default:
        // Could be a custom type (resource or enum reference)
        return type;
    }
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
 * Generate read type for a resource.
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
 * Generate create input type for a resource.
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
 * Generate update input type for a resource (all properties optional).
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
 * Generate enum type as string literal union.
 */
export function generateEnumType(enumDef: Enum): GeneratedType {
  const values = enumDef.values.map((v: { name: string }) => `'${v.name}'`).join(' | ');
  const content = `export type ${enumDef.name} = ${values};`;

  return { name: enumDef.name, content, imports: [] };
}

/**
 * Generate all types for a context.
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

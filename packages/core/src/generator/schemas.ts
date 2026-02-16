import type { GeneratorContext } from './context.js';
import type { Resource, PropertyType, Enum } from '../manifest/index.js';

export interface GeneratedSchema {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Convert manifest property type to Zod schema code.
 * Accepts PropertyType union or plain strings (for command parameter types).
 */
export function propertyTypeToZod(type: PropertyType | string | undefined, optional: boolean): string {
  let schema: string;

  if (!type) {
    schema = 'z.unknown()';
  } else if (typeof type === 'string') {
    switch (type) {
      case 'string':
        schema = 'z.string()';
        break;
      case 'number':
      case 'integer':
        schema = 'z.number()';
        break;
      case 'boolean':
        schema = 'z.boolean()';
        break;
      case 'date':
        schema = 'z.date()';
        break;
      case 'data':
        schema = 'z.instanceof(ArrayBuffer)';
        break;
      case 'file':
        schema = 'z.string()'; // Path
        break;
      case 'any':
        schema = 'z.unknown()';
        break;
      case 'point':
        schema = 'z.object({ x: z.number(), y: z.number() })';
        break;
      case 'rect':
        schema = 'z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })';
        break;
      case 'rgb':
        schema = 'z.object({ r: z.number(), g: z.number(), b: z.number() })';
        break;
      default:
        // Reference to another schema (shouldn't happen with current types)
        // Exhaustive check - this should never happen with current PrimitiveType
        schema = `${String(type)}Schema`;
        break;
    }
  } else if ('array' in type) {
    const elementSchema = propertyTypeToZod(type.array, false);
    schema = `z.array(${elementSchema})`;
  } else if ('enum' in type) {
    schema = `${type.enum}Schema`;
  } else if ('resource' in type) {
    schema = `${type.resource}Schema`;
  } else {
    schema = 'z.unknown()';
  }

  if (optional) {
    schema += '.optional()';
  }

  return schema;
}

/**
 * Generate Zod schema for a resource read type.
 */
export function generateResourceSchema(resource: Resource, _ctx: GeneratorContext): GeneratedSchema {
  const properties = Object.entries(resource.properties);
  const imports = ["import { z } from 'zod';"];

  const propLines = properties.map(([name, prop]) => {
    const zodSchema = propertyTypeToZod(prop.type, prop.optional);
    return `  ${name}: ${zodSchema},`;
  });

  const schemaName = `${resource.name}Schema`;
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${resource.name} = z.infer<typeof ${schemaName}>;`;

  return { name: schemaName, content, imports };
}

/**
 * Generate Zod schema for resource create input.
 */
export function generateCreateInputSchema(resource: Resource, _ctx: GeneratorContext): GeneratedSchema {
  const properties = Object.entries(resource.properties);
  const imports = ["import { z } from 'zod';"];

  // Only writable properties
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw');

  const propLines = writableProps.map(([name, prop]) => {
    // Required unless optional or has default
    const isOptional = prop.optional || prop.default !== undefined;
    const zodSchema = propertyTypeToZod(prop.type, isOptional);
    return `  ${name}: ${zodSchema},`;
  });

  const schemaName = `${resource.name}CreateInputSchema`;
  const typeName = `${resource.name}CreateInput`;
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${typeName} = z.infer<typeof ${schemaName}>;`;

  return { name: schemaName, content, imports };
}

/**
 * Generate Zod schema for resource update input (all optional).
 */
export function generateUpdateInputSchema(resource: Resource, _ctx: GeneratorContext): GeneratedSchema {
  const properties = Object.entries(resource.properties);
  const imports = ["import { z } from 'zod';"];

  // Only writable properties, all optional
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw');

  const propLines = writableProps.map(([name, prop]) => {
    const zodSchema = propertyTypeToZod(prop.type, true); // Always optional for update
    return `  ${name}: ${zodSchema},`;
  });

  const schemaName = `${resource.name}UpdateInputSchema`;
  const typeName = `${resource.name}UpdateInput`;
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${typeName} = z.infer<typeof ${schemaName}>;`;

  return { name: schemaName, content, imports };
}

/**
 * Generate Zod schema for an enum.
 */
export function generateEnumSchema(enumDef: Enum): GeneratedSchema {
  const imports = ["import { z } from 'zod';"];

  const values = enumDef.values.map((v: { name: string }) => `'${v.name}'`).join(', ');
  const schemaName = `${enumDef.name}Schema`;

  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.enum([${values}]);

export type ${enumDef.name} = z.infer<typeof ${schemaName}>;`;

  return { name: schemaName, content, imports };
}

/**
 * Generate all schemas for a context.
 */
export function generateSchemas(ctx: GeneratorContext): GeneratedSchema[] {
  const schemas: GeneratedSchema[] = [];

  // Generate enum schemas first (may be referenced by resources)
  for (const enumDef of ctx.getEnums()) {
    schemas.push(generateEnumSchema(enumDef));
  }

  // Generate resource schemas
  for (const resource of ctx.getResources()) {
    schemas.push(generateResourceSchema(resource, ctx));
    schemas.push(generateCreateInputSchema(resource, ctx));
    schemas.push(generateUpdateInputSchema(resource, ctx));
  }

  return schemas;
}

import type { GeneratorContext } from './context.js'
import type { Resource, PropertyType, Enum } from '../manifest/index.js'

export interface GeneratedSchema {
  name: string
  content: string
  imports: string[]
}

/**
 * Map of primitive type names to their Zod schema representations.
 */
const PRIMITIVE_TYPE_ZOD_MAP: Record<string, string> = {
  string: 'z.string()',
  number: 'z.number()',
  integer: 'z.number()',
  boolean: 'z.boolean()',
  date: 'z.date()',
  data: 'z.instanceof(ArrayBuffer)',
  file: 'z.string()', // Path
  any: 'z.unknown()',
  point: 'z.object({ x: z.number(), y: z.number() })',
  rect: 'z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })',
  rgb: 'z.object({ r: z.number(), g: z.number(), b: z.number() })',
}

/**
 * Convert manifest property type to Zod schema code.
 *
 * Handles three categories of types:
 * - Primitive types (string, number, boolean, date, etc.)
 * - Complex types (arrays, resource references, enum references)
 * - Custom type references (arbitrary strings referencing resources/enums)
 *
 * @param type - The property type from the manifest, or undefined
 * @param optional - Whether to wrap the schema in .optional()
 * @returns Zod schema code string
 *
 * @example
 * ```typescript
 * propertyTypeToZod('string', false)           // => 'z.string()'
 * propertyTypeToZod({ array: 'number' }, false) // => 'z.array(z.number())'
 * propertyTypeToZod({ enum: 'Priority' }, true) // => 'PrioritySchema.optional()'
 * ```
 */
export function propertyTypeToZod(type: PropertyType | undefined, optional: boolean): string {
  let schema: string

  if (!type) {
    schema = 'z.unknown()'
  } else if (typeof type === 'string') {
    // Check if it's a known primitive type
    const mapped = PRIMITIVE_TYPE_ZOD_MAP[type]
    if (mapped) {
      schema = mapped
    } else {
      // Custom type reference (resource or enum name)
      schema = `${type}Schema`
    }
  } else if ('array' in type) {
    const elementSchema = propertyTypeToZod(type.array, false)
    schema = `z.array(${elementSchema})`
  } else if ('enum' in type) {
    schema = `${type.enum}Schema`
  } else if ('resource' in type) {
    schema = `${type.resource}Schema`
  } else {
    schema = 'z.unknown()'
  }

  if (optional) {
    schema += '.optional()'
  }

  return schema
}

/**
 * Generate Zod schema for a resource read type.
 */
export function generateResourceSchema(
  resource: Resource,
  _ctx: GeneratorContext
): GeneratedSchema {
  const properties = Object.entries(resource.properties)
  const imports = ["import { z } from 'zod';"]

  const propLines = properties.map(([name, prop]) => {
    const zodSchema = propertyTypeToZod(prop.type, prop.optional)
    return `  ${name}: ${zodSchema},`
  })

  const schemaName = `${resource.name}Schema`
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${resource.name} = z.infer<typeof ${schemaName}>;`

  return { name: schemaName, content, imports }
}

/**
 * Generate Zod schema for resource create input.
 */
export function generateCreateInputSchema(
  resource: Resource,
  _ctx: GeneratorContext
): GeneratedSchema {
  const properties = Object.entries(resource.properties)
  const imports = ["import { z } from 'zod';"]

  // Only writable properties
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw')

  const propLines = writableProps.map(([name, prop]) => {
    // Required unless optional or has default
    const isOptional = prop.optional || prop.default !== undefined
    const zodSchema = propertyTypeToZod(prop.type, isOptional)
    return `  ${name}: ${zodSchema},`
  })

  const schemaName = `${resource.name}CreateInputSchema`
  const typeName = `${resource.name}CreateInput`
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${typeName} = z.infer<typeof ${schemaName}>;`

  return { name: schemaName, content, imports }
}

/**
 * Generate Zod schema for resource update input (all optional).
 */
export function generateUpdateInputSchema(
  resource: Resource,
  _ctx: GeneratorContext
): GeneratedSchema {
  const properties = Object.entries(resource.properties)
  const imports = ["import { z } from 'zod';"]

  // Only writable properties, all optional
  const writableProps = properties.filter(([_, prop]) => prop.access === 'rw')

  const propLines = writableProps.map(([name, prop]) => {
    const zodSchema = propertyTypeToZod(prop.type, true) // Always optional for update
    return `  ${name}: ${zodSchema},`
  })

  const schemaName = `${resource.name}UpdateInputSchema`
  const typeName = `${resource.name}UpdateInput`
  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.object({\n${propLines.join('\n')}\n});

export type ${typeName} = z.infer<typeof ${schemaName}>;`

  return { name: schemaName, content, imports }
}

/**
 * Generate Zod schema for an enum.
 */
export function generateEnumSchema(enumDef: Enum): GeneratedSchema {
  const imports = ["import { z } from 'zod';"]

  const values = enumDef.values.map((v: { name: string }) => `'${v.name}'`).join(', ')
  const schemaName = `${enumDef.name}Schema`

  const content = `${imports.join('\n')}\n\nexport const ${schemaName} = z.enum([${values}]);

export type ${enumDef.name} = z.infer<typeof ${schemaName}>;`

  return { name: schemaName, content, imports }
}

/**
 * Generate all schemas for a context.
 */
export function generateSchemas(ctx: GeneratorContext): GeneratedSchema[] {
  const schemas: GeneratedSchema[] = []

  // Generate enum schemas first (may be referenced by resources)
  for (const enumDef of ctx.getEnums()) {
    schemas.push(generateEnumSchema(enumDef))
  }

  // Generate resource schemas
  for (const resource of ctx.getResources()) {
    schemas.push(generateResourceSchema(resource, ctx))
    schemas.push(generateCreateInputSchema(resource, ctx))
    schemas.push(generateUpdateInputSchema(resource, ctx))
  }

  return schemas
}

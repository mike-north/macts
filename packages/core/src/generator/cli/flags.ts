import type { CommandParameter, Property, PropertyType } from '../../manifest/index.js'
import type { CliGeneratorContext } from './context.js'

/**
 * Generated flag definition for a Clipanion command.
 */
export interface GeneratedFlag {
  /** Property name for the flag */
  propertyName: string
  /** Clipanion option definition code */
  code: string
}

/**
 * Convert a manifest property to a CLI flag.
 */
export function propertyToFlag(
  propName: string,
  prop: Property,
  ctx: CliGeneratorContext
): GeneratedFlag {
  const flagName = toKebabCase(propName)
  const required = prop.access === 'rw' && !prop.optional
  const description = prop.description

  const typeInfo = getTypeInfo(prop.type, ctx)

  if (typeInfo.isBoolean) {
    return {
      propertyName: propName,
      code: `${propName} = Option.Boolean('--${flagName}', { description: ${JSON.stringify(description)} });`,
    }
  }

  if (typeInfo.isEnum) {
    const enumValues = typeInfo.enumValues ?? []
    const validator = `{ validator: t.isEnum([${enumValues.map((v) => JSON.stringify(v)).join(', ')}]) }`
    return {
      propertyName: propName,
      code: `${propName} = Option.String('--${flagName}', { required: ${String(required)}, description: ${JSON.stringify(description)}, ${validator.slice(2, -1)} });`,
    }
  }

  // Default to string
  return {
    propertyName: propName,
    code: `${propName} = Option.String('--${flagName}', { required: ${String(required)}, description: ${JSON.stringify(description)} });`,
  }
}

/**
 * Convert a command parameter to a CLI flag.
 */
export function parameterToFlag(param: CommandParameter, ctx: CliGeneratorContext): GeneratedFlag {
  const flagName = toKebabCase(param.name)
  const description = param.description

  // Check if parameter type is an enum (skip complex types)
  const paramType = typeof param.type === 'string' ? param.type : 'string'
  const enumDef = ctx.getEnum(paramType)
  if (enumDef) {
    const enumValues = enumDef.values.map((v) => v.name)
    return {
      propertyName: param.name,
      code: `${param.name} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(description)}, validator: t.isEnum([${enumValues.map((v) => JSON.stringify(v)).join(', ')}]) });`,
    }
  }

  // Check for primitive types
  if (paramType === 'boolean') {
    return {
      propertyName: param.name,
      code: `${param.name} = Option.Boolean('--${flagName}', { description: ${JSON.stringify(description)} });`,
    }
  }

  // Default to string for all other types
  return {
    propertyName: param.name,
    code: `${param.name} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(description)} });`,
  }
}

/**
 * Get type information for a property type.
 */
interface TypeInfo {
  isBoolean: boolean
  isEnum: boolean
  enumValues?: string[]
}

function getTypeInfo(type: PropertyType | undefined, ctx: CliGeneratorContext): TypeInfo {
  if (type === undefined || type === 'string') {
    return { isBoolean: false, isEnum: false }
  }

  if (type === 'boolean') {
    return { isBoolean: true, isEnum: false }
  }

  if (typeof type === 'object' && 'enum' in type) {
    const enumDef = ctx.getEnum(type.enum)
    if (enumDef) {
      return {
        isBoolean: false,
        isEnum: true,
        enumValues: enumDef.values.map((v) => v.name),
      }
    }
  }

  return { isBoolean: false, isEnum: false }
}

/**
 * Convert camelCase to kebab-case.
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

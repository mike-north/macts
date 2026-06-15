/**
 * MCP tool generation from manifest operations.
 *
 * @packageDocumentation
 */

import type {
  Command,
  CommandParameter,
  Property,
  PropertyType,
  Resource,
} from '../../manifest/index.js'
import type { GeneratedTool, JsonSchema } from './types.js'

/**
 * Convert a manifest property type to JSON Schema type.
 *
 * @param propType - Property type from manifest
 * @returns JSON Schema type string or object
 */
function propertyTypeToJsonSchemaType(propType: PropertyType): string | JsonSchema {
  // Handle primitive types
  if (typeof propType === 'string') {
    switch (propType) {
      case 'string':
      case 'file':
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'date':
        return 'string' // ISO 8601 string
      case 'data':
        return 'string' // base64 or similar
      case 'any':
        return 'string' // Default to string for safety
      case 'point':
      case 'rect':
      case 'rgb':
        return 'object'
      default:
        return 'string'
    }
  }

  // Handle array types. JSON Schema's `items` must be a schema object, so a
  // primitive element type (returned as a bare type string) is wrapped accordingly.
  if (typeof propType === 'object' && 'array' in propType) {
    const itemType = propertyTypeToJsonSchemaType(propType.array)
    return {
      type: 'array',
      items: typeof itemType === 'string' ? { type: itemType } : itemType,
    }
  }

  // Handle resource references
  if (typeof propType === 'object' && 'resource' in propType) {
    return 'string' // Resource references become string IDs
  }

  // Handle enum references
  if (typeof propType === 'object' && 'enum' in propType) {
    return 'string' // Enum values as strings
  }

  // Default to string
  return 'string'
}

/**
 * Convert a manifest property to JSON Schema property.
 *
 * @param property - Property from manifest
 * @returns JSON Schema object
 */
function propertyToJsonSchema(property: Property): JsonSchema {
  const propType = property.type ?? 'string'
  const typeValue = propertyTypeToJsonSchemaType(propType)

  const schema: JsonSchema = {
    description: property.description,
    ...(typeof typeValue === 'string' ? { type: typeValue } : typeValue),
  }

  return schema
}

/**
 * Convert command parameters to JSON Schema properties.
 *
 * @param parameters - Command parameters
 * @returns JSON Schema properties and required array
 */
function parametersToJsonSchema(parameters: CommandParameter[]): {
  properties: Record<string, JsonSchema>
  required: string[]
} {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  for (const param of parameters) {
    const typeValue = propertyTypeToJsonSchemaType(param.type as PropertyType)

    properties[param.name] = {
      description: param.description,
      ...(typeof typeValue === 'string' ? { type: typeValue } : typeValue),
    }

    if (param.required) {
      required.push(param.name)
    }
  }

  return { properties, required }
}

/**
 * Generate input schema for a resource operation.
 *
 * For CRUD operations, we derive the schema from resource properties:
 * - list: No parameters (or optional filters)
 * - get: Requires identifier property
 * - create: Requires writable properties (excluding read-only)
 * - update: Requires identifier + writable properties
 * - delete: Requires identifier property
 *
 * @param command - Command from manifest
 * @param resource - Resource this operation applies to
 * @returns JSON Schema for tool input
 */
export function generateResourceOperationSchema(command: Command, resource: Resource): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  // Add command parameters first
  if (command.parameters.length > 0) {
    const paramSchema = parametersToJsonSchema(command.parameters)
    Object.assign(properties, paramSchema.properties)
    required.push(...paramSchema.required)
  }

  // For operations that need identifier. Custom resource commands (e.g. "show")
  // take exactly their manifest parameters — the SDK does not synthesize an extra
  // ID argument for them — so only the standard CRUD ops get an implicit identifier.
  const needsId = ['get', 'update', 'delete'].includes(command.name)
  if (needsId && resource.identifiers && resource.identifiers.length > 0) {
    const primaryId = resource.identifiers.find((id) => id.primary) ?? resource.identifiers[0]
    if (primaryId) {
      const idProperty = resource.properties[primaryId.property]
      if (idProperty && !properties[primaryId.property]) {
        properties[primaryId.property] = propertyToJsonSchema(idProperty)
        required.push(primaryId.property)
      }
    }
  }

  // For create/update operations, include writable properties
  if (['create', 'update'].includes(command.name)) {
    for (const [propName, prop] of Object.entries(resource.properties)) {
      // Skip if already added as identifier
      if (properties[propName]) continue

      // Only include writable properties for create/update
      const isWritable = prop.access === 'rw'

      if (isWritable) {
        properties[propName] = propertyToJsonSchema(prop)
        // Required properties (only for writable properties on create)
        if (!prop.optional && command.name === 'create') {
          // Check if property is in identifiers (read-only IDs are not required on create)
          const isIdentifier = resource.identifiers?.some((id) => id.property === propName)
          if (!isIdentifier) {
            required.push(propName)
          }
        }
      }
    }
  }

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
    additionalProperties: false,
  }

  if (required.length > 0) {
    schema['required'] = required
  }

  return schema as JsonSchema
}

/**
 * Generate input schema for an application command.
 *
 * @param command - Command from manifest
 * @returns JSON Schema for tool input
 */
export function generateAppCommandSchema(command: Command): JsonSchema {
  const { properties, required } = parametersToJsonSchema(command.parameters)

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
    additionalProperties: false,
  }

  if (required.length > 0) {
    schema['required'] = required
  }

  return schema as JsonSchema
}

/**
 * Convert camelCase to snake_case.
 *
 * @param str - CamelCase string
 * @returns snake_case string
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Generate tool name from app, resource, and operation.
 *
 * Format: macts__<app>__<resource>_<operation>
 * Operation names are converted from camelCase to snake_case.
 *
 * @param appName - Application name
 * @param resourceName - Resource name (plural, lowercase)
 * @param operationName - Operation name (will be converted to snake_case)
 * @returns Tool name
 */
export function generateToolName(
  appName: string,
  resourceName: string,
  operationName: string
): string {
  const snakeOperation = camelToSnakeCase(operationName)
  return `macts__${appName.toLowerCase()}__${resourceName.toLowerCase()}_${snakeOperation}`
}

/**
 * Generate an MCP tool definition from a resource command.
 *
 * @param appName - Application name
 * @param resource - Resource from manifest
 * @param command - Command from manifest
 * @returns Generated tool definition
 */
export function generateResourceTool(
  appName: string,
  resource: Resource,
  command: Command
): GeneratedTool {
  const resourceName = resource.plural.toLowerCase()
  const toolName = generateToolName(appName, resourceName, command.name)
  const inputSchema = generateResourceOperationSchema(command, resource)

  return {
    name: toolName,
    resourceName,
    operationName: command.name,
    commandName: command.name,
    description: command.description,
    inputSchema,
    isResourceOperation: true,
    resourceType: resource.name,
  }
}

/**
 * Generate an MCP tool definition from an application command.
 *
 * @param appName - Application name
 * @param command - Command from manifest
 * @returns Generated tool definition
 */
export function generateAppTool(appName: string, command: Command): GeneratedTool {
  const toolName = generateToolName(appName, 'app', command.name)
  const inputSchema = generateAppCommandSchema(command)

  return {
    name: toolName,
    resourceName: 'app',
    operationName: command.name,
    commandName: command.name,
    description: command.description,
    inputSchema,
    isResourceOperation: false,
  }
}

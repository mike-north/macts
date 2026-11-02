/**
 * The input schemas and MCP tool names of a manifest's operations, as the
 * capability registry describes them.
 *
 * Each operation's input schema is built from the manifest by the rules below:
 * a resource command's parameters, plus the identifier and writable properties
 * its CRUD shape implies, or an application command's parameters. These
 * schemas are independent of the contract's wire schema (`input.wire`), which
 * is what MCP adapters serve and validate against; deriving them from the
 * contract instead is tracked in https://github.com/mike-north/macts/issues/188.
 *
 * The tool name is `macts__<app>__<resource>_<operation>`, and must equal the
 * name an MCP adapter serves the operation under. Operations and resources
 * marked unsupported have neither a schema nor a tool name.
 *
 * @packageDocumentation
 */

import type {
  AppManifest,
  Command,
  CommandParameter,
  Property,
  PropertyType,
  Resource,
} from '../manifest/index.js'
import { splitIdentifierWords } from '../manifest/lower-camel.js'
import {
  isUnsupportedResourceKey,
  usableCommands,
  usableProperties,
  usableResources,
} from '../manifest/unsupported.js'

/**
 * A JSON Schema object, as capability input and output schemas carry it.
 * Simplified representation matching MCP's JsonSchema interface.
 */
export interface JsonSchema {
  readonly type?: string
  readonly properties?: Record<string, JsonSchema>
  readonly required?: readonly string[]
  readonly items?: JsonSchema
  readonly enum?: readonly unknown[]
  readonly description?: string
  readonly additionalProperties?: boolean
  readonly [key: string]: unknown
}

/**
 * Get the usable resources from a manifest: every resource except those marked
 * unsupported, which have no tools or capabilities.
 *
 * @param manifest - App manifest
 * @returns Array of resources
 */
export function getResources(manifest: AppManifest): Resource[] {
  return usableResources(manifest).map(([, resource]) => resource)
}

/**
 * Get all application-level commands from manifest, except those marked
 * unsupported.
 *
 * @param manifest - App manifest
 * @returns Array of application commands
 */
export function getAppCommands(manifest: AppManifest): Command[] {
  return usableCommands(manifest)
    .map(([, cmd]) => cmd)
    .filter((cmd) => cmd.scope === 'application')
}

/**
 * Get resource-scoped commands that apply to a specific resource: none for a
 * resource marked unsupported, and none marked unsupported itself.
 *
 * @param manifest - App manifest
 * @param resourceName - Resource name
 * @returns Array of commands for this resource
 */
export function getResourceCommands(manifest: AppManifest, resourceName: string): Command[] {
  if (isUnsupportedResourceKey(manifest, resourceName)) return []
  return usableCommands(manifest)
    .map(([, cmd]) => cmd)
    .filter((cmd) => {
      if (cmd.scope !== 'resource') return false
      if (!cmd.resourceType) return true // Applies to all resources
      if (Array.isArray(cmd.resourceType)) {
        return cmd.resourceType.includes(resourceName)
      }
      return cmd.resourceType === resourceName
    })
}

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
        // Only add the identifier property to the schema if the command did not
        // already declare its own required param (e.g. an explicit `id` param).
        // When the command already has required params the identifier property is
        // informational only — it must NOT appear in `required` because the handler
        // consumes the command param, not the resource property name.
        properties[primaryId.property] = propertyToJsonSchema(idProperty)
        if (required.length === 0) {
          required.push(primaryId.property)
        }
      }
    }
  }

  // For create/update operations, include writable properties
  if (['create', 'update'].includes(command.name)) {
    for (const [propName, prop] of usableProperties(resource)) {
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
 * An operation name in snake case: its words ({@link splitIdentifierWords}),
 * lowercased and joined by `_`. An acronym is one word, so
 * `invokeAPIExpression` → `invoke_api_expression` and `getURL` → `get_url`,
 * the same split that spells resources in lower camel case.
 *
 * @param operationName - A camel case operation name
 * @returns The operation name in snake case
 */
function operationSnakeCase(operationName: string): string {
  return splitIdentifierWords(operationName)
    .map((word) => word.toLowerCase())
    .join('_')
}

/**
 * Generate tool name from app, resource, and operation.
 *
 * Format: macts__<app>__<resource>_<operation>
 * The resource part is the resource's segment as given, the same spelling as
 * its routes, SDK accessor and derived permissions (`mediaItems`), or `app`
 * for an application command. The operation is in snake case, with each
 * acronym one word (`invokeAPIExpression` → `invoke_api_expression`).
 *
 * @param appName - Application name
 * @param resourceName - The resource segment (`normalizeResourceRouteSegment`), or `app`
 * @param operationName - Operation name (will be converted to snake_case)
 * @returns Tool name
 */
export function generateToolName(
  appName: string,
  resourceName: string,
  operationName: string
): string {
  const snakeOperation = operationSnakeCase(operationName)
  return `macts__${appName.toLowerCase()}__${resourceName}_${snakeOperation}`
}

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';
import type { JsonSchema7Type } from 'zod-to-json-schema';

/**
 * Options for JSON Schema generation.
 */
export interface JsonSchemaOptions {
  /** App name for $id generation */
  appName?: string;
  /** Schema name (e.g., 'resource', 'command') */
  schemaName?: string;
  /** Full custom $id override */
  id?: string;
}

/**
 * Convert a Zod schema to JSON Schema Draft 7.
 *
 * @param schema - Zod schema to convert
 * @param options - Options for $id and naming
 * @returns JSON Schema object
 */
export function toJsonSchema(schema: z.ZodType, options: JsonSchemaOptions = {}): JsonSchema7Type {
  const { appName, schemaName, id } = options;

  // Generate $id if components provided
  const $id = id ?? (appName && schemaName ? `macts://${appName}/${schemaName}` : undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  const jsonSchema = zodToJsonSchema(schema as any, {
    $refStrategy: 'none', // Inline all definitions
    target: 'jsonSchema7', // JSON Schema Draft-07 (widely supported)
  });

  // Add $id if provided
  if ($id && typeof jsonSchema === 'object') {
    return { $id, ...jsonSchema } as unknown as JsonSchema7Type;
  }

  return jsonSchema;
}

/**
 * Convert a Zod schema to JSON Schema with definitions.
 * Useful for complex schemas with cross-references.
 *
 * @param schema - Zod schema to convert
 * @param name - Name for the schema in $defs
 * @returns JSON Schema object with definitions
 */
export function toJsonSchemaWithDefinitions(schema: z.ZodType, name: string): JsonSchema7Type {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  return zodToJsonSchema(schema as any, {
    name,
    $refStrategy: 'root',
    target: 'jsonSchema7',
  });
}

/**
 * Request validation using Zod schemas built from command definitions.
 *
 * Schemas are built once at server startup via {@link buildSchemaRegistry},
 * not per-request, to avoid repeated schema construction overhead.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import type { Command } from '@macts/core'

/**
 * Build a Zod schema for a command's parameters.
 *
 * Maps command parameter types to Zod validators:
 * - `string` (and unknown types) -> `z.string()`
 * - `number` / `integer` -> `z.number()`
 * - `boolean` -> `z.boolean()`
 * - `date` -> ISO datetime or date string
 *
 * Optional parameters use `.optional()`. The schema uses `.passthrough()`
 * to allow additional properties (forward-compatibility).
 *
 * @param command - The command definition to build a schema for
 * @returns A Zod schema that validates the command's parameters
 */
export function buildCommandSchema(command: Command): z.ZodType {
  if (command.parameters.length === 0) {
    return z.object({}).passthrough()
  }

  const shape: Record<string, z.ZodType> = {}

  for (const param of command.parameters) {
    let schema: z.ZodType

    switch (param.type) {
      case 'number':
      case 'integer':
        schema = z.number()
        break
      case 'boolean':
        schema = z.boolean()
        break
      case 'date':
        schema = z.string().datetime().or(z.string().date())
        break
      case 'string':
      default:
        schema = z.string()
        break
    }

    shape[param.name] = param.required ? schema : schema.optional()
  }

  return z.object(shape).passthrough()
}

/**
 * Build a registry of validation schemas for all commands.
 *
 * Call this once at server startup. The returned map associates
 * each command name with its pre-built Zod schema.
 *
 * @param commands - Record of command name to command definition
 * @returns Map from command name to Zod schema
 */
export function buildSchemaRegistry(commands: Record<string, Command>): Map<string, z.ZodType> {
  const registry = new Map<string, z.ZodType>()

  for (const [name, command] of Object.entries(commands)) {
    registry.set(name, buildCommandSchema(command))
  }

  return registry
}

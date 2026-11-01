/**
 * Per-command request schemas derived directly from manifest parameters.
 *
 * These are the input contracts of today's RPC requests: plain JSON records
 * whose parameters are checked for presence and primitive type, with extra keys
 * allowed for forward compatibility. They back the passthrough operation
 * descriptors the runtime builds from a manifest, and the HTTP adapter's
 * request validation, so both surfaces accept exactly the same requests.
 *
 * They are an interim source. Once generated contracts carry value types, each
 * operation's wire schema comes from its descriptor and this independent
 * mapping is retired.
 *
 * Schemas are built once at registration or startup via
 * {@link buildSchemaRegistry}, not per request.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import type { Command } from '@macts/core'

/**
 * Build a Zod schema for a command's parameters.
 *
 * Maps command parameter types to Zod validators:
 * - `string` (and unknown types) maps to `z.string()`
 * - `number` / `integer` maps to `z.number()`
 * - `boolean` maps to `z.boolean()`
 * - `date` maps to ISO datetime or date string
 *
 * Optional parameters use `.optional()`. The schema uses `.loose()`
 * to allow additional properties (forward-compatibility).
 *
 * @param command - The command definition to build a schema for
 * @returns A Zod schema that validates the command's parameters
 */
export function buildCommandSchema(command: Command): z.ZodType {
  if (command.parameters.length === 0) {
    return z.object({}).loose()
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
        schema = z.iso.datetime().or(z.iso.date())
        break
      case 'string':
      default:
        schema = z.string()
        break
    }

    shape[param.name] = param.required ? schema : schema.optional()
  }

  return z.object(shape).loose()
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

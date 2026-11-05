/**
 * Per-command request schemas derived directly from manifest parameters.
 *
 * These are the input contracts of today's RPC requests: plain JSON records
 * whose parameters are checked for presence and primitive type. Each command
 * has two forms:
 *
 * - the declared-input schema ({@link buildDeclaredInputSchema}), which admits
 *   exactly the command's parameters and rejects any other key. It backs the
 *   passthrough operation descriptors the runtime builds from a manifest, so a
 *   manifest-registered operation accepts the same keys a contract-registered
 *   one does, and audit and approval records describe exactly what runs.
 * - the permissive request schema ({@link buildCommandSchema}), which checks
 *   the same parameters but lets other keys through. It is not what the
 *   runtime validates.
 *
 * They are an interim source. Once generated contracts carry value types, each
 * operation's wire schema comes from its descriptor and this independent
 * mapping is retired.
 *
 * Integer inputs deliberately differ between registration paths: manifest-only
 * embedders (`registerManifest` or `createMultiServer`'s `manifests` option)
 * take bare JSON numbers unchanged, while generated contracts take tagged
 * integers (`{ integer: "7" }`). The served host registers contracts, so its
 * generated HTTP clients and CLI use the tagged form. Capability schemas still
 * describe the manifest-only numeric form. Do not add an integer codec here:
 * passthrough registration is to be retired alongside the thin adapters, leaving
 * contract registration as the sole input authority.
 *
 * Schemas are built once at registration or startup, not per request.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import type { Command } from '@macts/core'

/** A manifest parameter's declared type. */
type ParameterType = Command['parameters'][number]['type']

/**
 * The validator of one parameter, by its manifest type. Any type other than
 * the primitive ones listed, including a structured type, is read as text.
 */
function parameterSchema(type: ParameterType): z.ZodType {
  switch (type) {
    case 'number':
    case 'integer':
      return z.number()
    case 'boolean':
      return z.boolean()
    case 'date':
      return z.iso.datetime().or(z.iso.date())
    case 'string':
    default:
      return z.string()
  }
}

/** One validator per declared parameter, optional where the parameter is. */
function parameterShape(command: Command): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {}
  for (const param of command.parameters) {
    const schema = parameterSchema(param.type)
    shape[param.name] = param.required ? schema : schema.optional()
  }
  return shape
}

/**
 * Build the schema of a command's declared input: its parameters and nothing
 * else.
 *
 * @remarks
 * Parameters map to validators as in {@link buildCommandSchema}. Any key that
 * is not a declared parameter is rejected with one `unrecognized_keys` issue
 * at the record itself, so a command with no parameters admits only `{}`.
 *
 * This is the input contract of every operation registered from a manifest
 * alone. A manifest-registered operation never pages, so no input beyond the
 * command's parameters is declared.
 *
 * @param command - The command definition to build a schema for.
 * @returns A Zod schema that admits exactly the command's parameters.
 */
export function buildDeclaredInputSchema(command: Command): z.ZodType {
  return z.strictObject(parameterShape(command))
}

/**
 * Build a Zod schema for a command's parameters that lets other keys through.
 *
 * Maps command parameter types to Zod validators:
 * - `string` (and unknown types) maps to `z.string()`
 * - `number` / `integer` maps to `z.number()`
 * - `boolean` maps to `z.boolean()`
 * - `date` maps to ISO datetime or date string
 *
 * Optional parameters use `.optional()`. The schema uses `.loose()`, so keys
 * that are not parameters pass validation unchanged. The runtime does not
 * validate operation input with this schema: manifest-registered operations
 * reject undeclared keys (see {@link buildDeclaredInputSchema}).
 *
 * @param command - The command definition to build a schema for
 * @returns A Zod schema that validates the command's parameters
 */
export function buildCommandSchema(command: Command): z.ZodType {
  return z.object(parameterShape(command)).loose()
}

/**
 * Build a registry of permissive request schemas ({@link buildCommandSchema})
 * for all commands.
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

/**
 * Validation schema for benchmark task definitions.
 *
 * Tasks are authored as plain data (see {@link ./registry.ts}) and may also be
 * loaded from external JSON so another engineer can add tasks without touching
 * harness code. This module is the single trust boundary that validates either
 * source into a typed {@link TaskDefinition}.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import type { TaskDefinition } from '../types.js'

/** Operation-class enum, mirroring the macts risk model (VISION.md §7.1). */
const operationClassSchema = z.enum(['read', 'write', 'delete', 'send', 'execute', 'system-change'])

/**
 * Zod schema for a single task definition.
 *
 * @remarks
 * Defined at module scope (not inline) so it is not rebuilt per call. IDs are
 * constrained to kebab-case to keep report keys stable and filesystem-safe.
 */
export const taskDefinitionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
    intent: z.string().min(1),
    apps: z.array(z.string().min(1)).min(1),
    operationClass: operationClassSchema,
    mactsCapabilities: z.array(z.string().min(1)).min(1),
    notes: z.string().optional(),
  })
  .strict()

/**
 * Normalize a parsed schema object into a {@link TaskDefinition}, omitting the
 * optional `notes` key entirely when it is absent. This keeps the result sound
 * under `exactOptionalPropertyTypes` (an absent optional, never `key: undefined`).
 */
function normalize(parsed: z.infer<typeof taskDefinitionSchema>): TaskDefinition {
  const base = {
    id: parsed.id,
    intent: parsed.intent,
    apps: parsed.apps,
    operationClass: parsed.operationClass,
    mactsCapabilities: parsed.mactsCapabilities,
  }
  return parsed.notes === undefined ? base : { ...base, notes: parsed.notes }
}

/**
 * Validate and normalize a single unknown value into a {@link TaskDefinition}.
 *
 * @throws ZodError if the value does not satisfy {@link taskDefinitionSchema}.
 */
export function parseTaskDefinition(value: unknown): TaskDefinition {
  return normalize(taskDefinitionSchema.parse(value))
}

/**
 * Validate an array of unknown values into task definitions, additionally
 * enforcing that task `id`s are unique across the set.
 *
 * @throws ZodError if the input is not an array of >=1 valid task definitions.
 * @throws Error if two tasks share an `id`.
 */
export function parseTaskSet(values: unknown): TaskDefinition[] {
  const arraySchema = z.array(taskDefinitionSchema).min(1)
  const tasks = arraySchema.parse(values).map(normalize)

  const seen = new Set<string>()
  for (const task of tasks) {
    if (seen.has(task.id)) {
      throw new Error(`Duplicate task id: ${task.id}`)
    }
    seen.add(task.id)
  }
  return tasks
}

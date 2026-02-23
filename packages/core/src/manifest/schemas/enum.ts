import { z } from 'zod'

/**
 * Schema for a single enum value.
 */
export const EnumValueSchema = z.object({
  /** Value name */
  name: z.string(),
  /** Actual value (string or number) */
  value: z.union([z.string(), z.number()]),
  /** Human-readable description */
  description: z.string().optional(),
  /** AppleScript four-character code */
  code: z.string().min(1).max(4).optional(),
})
export type EnumValue = z.infer<typeof EnumValueSchema>

/**
 * Schema for an enumeration type.
 */
export const EnumSchema = z.object({
  /** Enum name (PascalCase) */
  name: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** AppleScript four-character code */
  code: z.string().min(1).max(4).optional(),
  /** Enum values */
  values: z.array(EnumValueSchema).min(1),
})
export type Enum = z.infer<typeof EnumSchema>

import { z } from 'zod'

/**
 * Command scope - whether command operates on application or specific resource.
 */
export const CommandScopeSchema = z.enum(['application', 'resource'])
export type CommandScope = z.infer<typeof CommandScopeSchema>

/**
 * Command parameter schema.
 */
export const CommandParameterSchema = z.object({
  /** Parameter name */
  name: z.string(),
  /** Parameter type (primitive string or reference object) */
  type: z.union([z.string(), z.record(z.string(), z.string())]),
  /** Human-readable description */
  description: z.string(),
  /** Whether parameter is required */
  required: z.boolean().default(true),
  /** Default value if not required */
  default: z.unknown().optional(),
  /** AppleScript four-character code */
  code: z.string().min(1).max(4).optional(),
})
export type CommandParameter = z.infer<typeof CommandParameterSchema>

/**
 * Permission history entry - tracks when a command's permission changed.
 * Used to provide helpful error messages when keys become invalid.
 */
export const PermissionHistoryEntrySchema = z.object({
  /** Version when the permission changed */
  version: z.string(),
  /** Previous permission string */
  permission: z.string(),
  /** ISO date when the change occurred */
  changed: z.string(),
  /** Human-readable reason for the change */
  reason: z.string().optional(),
})
export type PermissionHistoryEntry = z.infer<typeof PermissionHistoryEntrySchema>

/**
 * Schema for a command definition.
 */
export const CommandSchema = z.object({
  /** Command name (camelCase) */
  name: z.string(),
  /** Human-readable description */
  description: z.string(),
  /** Command scope */
  scope: CommandScopeSchema,
  /** If resource-scoped, which resource type(s) can be targeted */
  resourceType: z.union([z.string(), z.array(z.string())]).optional(),
  /** Input parameters */
  parameters: z.array(CommandParameterSchema).default([]),
  /** Return type (void if omitted) */
  returns: z.string().optional(),
  /** AppleScript four-character code */
  code: z.string().min(1).max(4).optional(),
  /**
   * Fine-grained permission required to execute this command.
   * Format: `app:resource:operation` (e.g., `calendar:events:list`)
   */
  permission: z.string().optional(),
  /**
   * History of permission changes for upgrade messages.
   * Sorted newest-first.
   */
  permissionHistory: z.array(PermissionHistoryEntrySchema).optional(),
})
export type Command = z.infer<typeof CommandSchema>

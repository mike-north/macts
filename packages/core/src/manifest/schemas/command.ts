import { z } from 'zod';

/**
 * Command scope - whether command operates on application or specific resource.
 */
export const CommandScopeSchema = z.enum(['application', 'resource']);
export type CommandScope = z.infer<typeof CommandScopeSchema>;

/**
 * Command parameter schema.
 */
export const CommandParameterSchema = z.object({
  /** Parameter name */
  name: z.string(),
  /** Parameter type (primitive or reference) */
  type: z.string(),
  /** Human-readable description */
  description: z.string(),
  /** Whether parameter is required */
  required: z.boolean().default(true),
  /** Default value if not required */
  default: z.unknown().optional(),
  /** AppleScript four-character code */
  code: z.string().length(4).optional(),
});
export type CommandParameter = z.infer<typeof CommandParameterSchema>;

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
  code: z.string().length(4).optional(),
});
export type Command = z.infer<typeof CommandSchema>;

import { z } from 'zod'
import {
  DictionaryHandlerEvidenceSchema,
  LiveAbsenceEvidenceSchema,
  NullabilityEvidenceSchema,
  checkNullabilityClaim,
} from './evidence.js'

/**
 * Command scope - whether command operates on application or specific resource.
 */
export const CommandScopeSchema = z.enum(['application', 'resource'])
export type CommandScope = z.infer<typeof CommandScopeSchema>

/**
 * Risk classification for a command.
 *
 * Risk is normally *derived deterministically* from the operation semantics by
 * the capability layer (see `capabilities/risk.ts`); this manifest field exists
 * only as an optional override for the rare case where the derived value is
 * wrong (lossless-plus). It must be one of the canonical risk classes.
 */
export const RiskClassSchema = z.enum([
  'read',
  'write',
  'delete',
  'send',
  'execute',
  'system-change',
])
export type RiskClassValue = z.infer<typeof RiskClassSchema>

/**
 * Command parameter schema. Strict, like {@link CommandSchema}.
 *
 * @remarks
 * A parameter accepts `null` only when it claims `nullable: true`, with
 * evidence; without a claim it does not. (Widening an input to accept `null`
 * later is compatible for callers; narrowing it is not, so inputs start
 * narrow.)
 */
export const CommandParameterSchema = z
  .object({
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
    /** Whether the parameter accepts `null`. Absent means it does not. */
    nullable: z.boolean().optional(),
    /** The evidence for `nullable`. */
    evidence: z
      .object({
        /** Evidence for the `nullable` claim. */
        nullable: NullabilityEvidenceSchema.optional(),
      })
      .optional(),
  })
  .strict()
  .superRefine((parameter, ctx) => {
    checkNullabilityClaim(parameter, ctx)
    // Absent reads are failed reads of a property; a parameter is never read.
    if (parameter.evidence?.nullable?.source === 'curated') {
      if (parameter.evidence.nullable.absentReads !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'absentReads records reads of a property in which the app reported no value; a parameter is never read, so it cannot record them.',
          path: ['evidence', 'nullable', 'absentReads'],
        })
      }
    }
  })
export type CommandParameter = z.infer<typeof CommandParameterSchema>

/**
 * Permission history entry - tracks when a command's permission changed.
 * Used to provide helpful error messages when keys become invalid.
 */
export const PermissionHistoryEntrySchema = z
  .object({
    /** Version when the permission changed */
    version: z.string(),
    /** Previous permission string */
    permission: z.string(),
    /** ISO date when the change occurred */
    changed: z.string(),
    /** Human-readable reason for the change */
    reason: z.string().optional(),
  })
  .strict()
export type PermissionHistoryEntry = z.infer<typeof PermissionHistoryEntrySchema>

/**
 * The evidence behind a command's `unsupported` marker, in one of two forms:
 * the running app failed to address what the command reads
 * ({@link LiveAbsenceEvidenceSchema}), or the app's dictionary documents the
 * command as a handler the app sends to a script rather than one it carries
 * out ({@link DictionaryHandlerEvidenceSchema}).
 */
export const CommandUnsupportedEvidenceSchema = z.discriminatedUnion('source', [
  LiveAbsenceEvidenceSchema,
  DictionaryHandlerEvidenceSchema,
])
export type CommandUnsupportedEvidence = z.infer<typeof CommandUnsupportedEvidenceSchema>

/**
 * The marker on a command no caller can have the app carry out, as its
 * evidence shows: addressing what the command reads failed in a live,
 * read-only observation (a collection a get command looks an item up in, say,
 * that the app does not have at the application), or the app's dictionary
 * documents the command as a handler the app itself sends to a user's script.
 *
 * The manifest keeps such a command, so the record of what the dictionary
 * declares and what macts expected stays complete and the omission stays
 * auditable; the command has no route, and every generated surface (the
 * operations behind routes, the contract, SDKs, tools, the CLI, capabilities
 * and derived permissions) leaves it out. The marker is curated from the
 * evidence: no probe writes or changes it.
 */
export const CommandUnsupportedSchema = z
  .object({
    /** What shows that no caller can have the app carry out the command. */
    evidence: CommandUnsupportedEvidenceSchema,
  })
  .strict()
export type CommandUnsupported = z.infer<typeof CommandUnsupportedSchema>

/**
 * The parent a resource command's target is reached through: the resource
 * whose items hold the command's resource as elements, and the command's own
 * parameter that carries the parent item's identifier.
 *
 * A Calendar event exists only inside a calendar, so `getEvent` records
 * `{ resource: Calendar, parameter: calendarId }`. Native bodies address the
 * parent resource's collection in the app, the parent item in it by that
 * resource's identifier targeting, with the identifier read from the named
 * parameter, and then the command's resource collection under that item.
 *
 * The parent is a fact the curator records from the app's dictionary (the
 * parent's class has the command's resource as an element), never derived:
 * not from a parameter's name or position, and not from the hierarchy. A
 * command without a parent addresses its resource's collection at the
 * application. The manifest schema rejects a parent resource the manifest
 * does not declare or marks unsupported, and a parameter that is not one of
 * the command's required parameters.
 */
export const CommandParentSchema = z
  .object({
    /** The parent resource: a key of `manifest.resources`. */
    resource: z.string().min(1),
    /** The command's required parameter that carries the parent's identifier. */
    parameter: z.string().min(1),
  })
  .strict()

/**
 * The parent a command on a nested resource records: the resource whose items
 * hold the command's resource, and the command's required parameter carrying
 * the parent item's identifier (see {@link CommandParentSchema}).
 */
export type CommandParent = z.infer<typeof CommandParentSchema>

/** An explicit selection binding; positions are selectors and never identity. */
export const AddressSelectionSchema = z
  .object({
    by: z.enum(['identity', 'index']),
    parameter: z.string().min(1),
  })
  .strict()

/** A selected containment edge, ordered from the application toward the target. */
export const AddressParentSchema = AddressSelectionSchema.extend({
  resource: z.string().min(1),
  collection: z.string().min(1),
}).strict()

/** One explicit ancestor selection in an operation address. */
export type AddressParent = z.infer<typeof AddressParentSchema>

/**
 * Schema for a command definition.
 *
 * Strict by design: a key the schema does not know is a parse error, never
 * silently dropped. A command may gain a field that withholds or restricts it
 * (the `unsupported` marker is one); a runtime that predates the field must
 * refuse the manifest rather than strip the field and offer the command. The
 * same holds for the command's parameters and permission-history entries.
 */
export const CommandSchema = z
  .object({
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
    /**
     * The parent the command's target is reached through, as the curator
     * records it (see {@link CommandParentSchema}). Absent for a command whose
     * resource is addressed at the application.
     */
    parent: CommandParentSchema.optional(),
    /** Complete navigation path; cannot be combined with the legacy single parent. */
    parents: z.array(AddressParentSchema).min(1).optional(),
    /** Explicit final item binding, separate from ancestors and action arguments. */
    item: AddressSelectionSchema.optional(),
    /** Mixed paths are explicit calls only; canonical resolving routes remain identity-addressable. */
    resolvesReferences: z.boolean().optional(),
    /** Complete plural search between the identity parent and the final identified collection. */
    identityTraversal: z
      .object({
        collections: z.array(z.string().min(1)).min(1),
        evidence: z.string().min(1),
      })
      .strict()
      .optional(),
    /** Return type (void if omitted) */
    returns: z.string().optional(),
    /**
     * A property-backed convenience: assign one fixed literal to a writable
     * property of the selected item, rather than invoking an app command.
     * Manifest validation checks its target, value, permission, and inputs.
     */
    assignsProperty: z
      .object({
        property: z.string().min(1),
        value: z.union([z.string(), z.number(), z.boolean()]),
      })
      .strict()
      .optional(),
    /** AppleScript four-character code */
    code: z.string().min(1).max(4).optional(),
    /**
     * The command's segment in its public route (`app.resource.<routeName>`) and
     * in its default permission (`app:resource:<routeName>`). Defaults to the
     * command's key in `manifest.commands`.
     *
     * It lets two manifest commands that share a CRUD verb but differ in
     * signature (a resource whose `get` takes a different identifier than the
     * shared `get`, say) each publish the canonical operation name, while
     * keeping distinct manifest keys. Two routes that end up with the same
     * route string are a manifest error.
     */
    routeName: z
      .string()
      .min(1)
      .regex(/^[^.:]+$/, 'routeName must not contain "." or ":"')
      .optional(),
    /**
     * Fine-grained permission required to execute this command.
     * Format: `app:resource:operation` (e.g., `calendar:events:list`)
     */
    permission: z.string().optional(),
    /**
     * Optional risk-classification override.
     *
     * When present, this wins over the value derived from the operation name.
     * When absent (the common case), risk is derived deterministically so no
     * manifest needs hand-annotation.
     */
    risk: RiskClassSchema.optional(),
    /**
     * History of permission changes for upgrade messages.
     * Sorted newest-first.
     */
    permissionHistory: z.array(PermissionHistoryEntrySchema).optional(),
    /**
     * Set when no caller can have the app carry out the command (the running
     * app cannot, or the app sends it to scripts as a handler), with the
     * evidence. A command marked unsupported has no route, and generated
     * surfaces omit it.
     */
    unsupported: CommandUnsupportedSchema.optional(),
  })
  .strict()
export type Command = z.infer<typeof CommandSchema>

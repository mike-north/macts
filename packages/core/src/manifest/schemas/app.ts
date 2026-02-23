import { z } from 'zod'
import { ResourceSchema } from './resource.js'
import { EnumSchema } from './enum.js'
import { CommandSchema } from './command.js'
import { HierarchySchema } from './hierarchy.js'
import { RelationshipSchema } from './relationship.js'
import { AppMetadataSchema, SuiteSchema, ExtractionMetadataSchema } from './metadata.js'

/**
 * Coarse category to fine-grained permissions mapping.
 * Maps operation names (read, create, write, delete, etc.) to arrays
 * of fine-grained permission strings.
 */
export const CoarseMappingSchema = z.record(
  z.string(), // coarse category name (read, create, write, delete, purge, admin, etc.)
  z.array(z.string()) // list of fine-grained permission strings
)
export type CoarseMapping = z.infer<typeof CoarseMappingSchema>

/**
 * Permissions section - maps resources to their coarse→fine permission mappings.
 * This defines the relationship between coarse CRUD-style permissions
 * and fine-grained per-command permissions.
 */
export const PermissionsSectionSchema = z.record(
  z.string(), // resource name (events, calendars, app)
  CoarseMappingSchema
)
export type PermissionsSection = z.infer<typeof PermissionsSectionSchema>

/**
 * Top-level manifest schema for a macOS application.
 * This is the complete representation of an app's scriptable interface.
 */
export const AppManifestSchema = z
  .object({
    /** Manifest format version */
    version: z.literal('1.0'),
    /** Application metadata */
    app: AppMetadataSchema,
    /** Suite organization (from dictionary) */
    suites: z.array(SuiteSchema).default([]),
    /** Resource type definitions (at least one required) */
    resources: z.record(z.string(), ResourceSchema),
    /** Enumeration definitions */
    enums: z.record(z.string(), EnumSchema).default({}),
    /** Containment hierarchy */
    hierarchy: HierarchySchema,
    /** Non-hierarchical relationships */
    relationships: z.array(RelationshipSchema).default([]),
    /** Command definitions */
    commands: z.record(z.string(), CommandSchema).default({}),
    /**
     * Permissions mapping section.
     * Maps coarse CRUD-style permissions to fine-grained per-command permissions.
     * Example: events.read → [calendar:events:list, calendar:events:get, calendar:events:show]
     */
    permissions: PermissionsSectionSchema.optional(),
    /** Extraction metadata (confidence, open questions) */
    extraction: ExtractionMetadataSchema.optional(),
  })
  .refine((data) => Object.keys(data.resources).length > 0, {
    message: 'At least one resource is required',
    path: ['resources'],
  })
export type AppManifest = z.infer<typeof AppManifestSchema>

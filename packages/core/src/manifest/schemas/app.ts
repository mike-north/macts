import { z } from 'zod';
import { ResourceSchema } from './resource.js';
import { EnumSchema } from './enum.js';
import { CommandSchema } from './command.js';
import { HierarchySchema } from './hierarchy.js';
import { RelationshipSchema } from './relationship.js';
import { AppMetadataSchema, SuiteSchema, ExtractionMetadataSchema } from './metadata.js';

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
    /** Extraction metadata (confidence, open questions) */
    extraction: ExtractionMetadataSchema.optional(),
  })
  .refine((data) => Object.keys(data.resources).length > 0, {
    message: 'At least one resource is required',
    path: ['resources'],
  });
export type AppManifest = z.infer<typeof AppManifestSchema>;

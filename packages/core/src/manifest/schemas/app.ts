import { z } from 'zod'
import { ResourceSchema } from './resource.js'
import { EnumSchema } from './enum.js'
import { CommandSchema } from './command.js'
import { HierarchySchema, type HierarchyChild } from './hierarchy.js'
import { RelationshipSchema } from './relationship.js'
import { AppMetadataSchema, SuiteSchema, ExtractionMetadataSchema } from './metadata.js'
import { findDuplicateRoutes } from '../route.js'
import { findSuperclassIssues, flattenSuperclasses, superclassChain } from '../superclasses.js'
import {
  findUnsupportedTypeReferences,
  type UnsupportedTypeReference,
  isCommandUnsupported,
  isResourceUnsupported,
} from '../unsupported.js'

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

/** A manifest issue: what is wrong, and where in the manifest. */
interface ManifestIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/**
 * The issues of every command's recorded parent (`command.parent`): a parent
 * that names a resource the manifest does not declare, or names a parameter
 * that is not one of the command's required parameters, leaves a body nothing
 * to address the parent by. On a usable command, a parent resource marked
 * unsupported is an issue too: no generated surface declares it, and the app
 * has no such collection to reach the target through.
 */
function findCommandParentIssues(
  manifest: Pick<AppManifest, 'resources' | 'commands'>
): ManifestIssue[] {
  const issues: ManifestIssue[] = []
  for (const [commandKey, command] of Object.entries(manifest.commands)) {
    const parent = command.parent
    if (parent === undefined) continue
    const site = `commands.${commandKey}.parent`
    const resourcePath = ['commands', commandKey, 'parent', 'resource']
    const resource = Object.hasOwn(manifest.resources, parent.resource)
      ? manifest.resources[parent.resource]
      : undefined
    if (resource === undefined) {
      issues.push({
        message: `${site}.resource: "${parent.resource}" is not a resource the manifest declares; name the key of the resource whose items hold the command's target.`,
        path: resourcePath,
      })
    } else if (isResourceUnsupported(resource) && !isCommandUnsupported(command)) {
      issues.push({
        message: `${site}.resource: "${parent.resource}" is marked unsupported, so the command's target cannot be reached through it; name another parent, or mark the command unsupported too.`,
        path: resourcePath,
      })
    }
    const parameter = command.parameters.find((p) => p.name === parent.parameter)
    if (parameter?.required !== true) {
      const problem =
        parameter === undefined
          ? 'is not a parameter the command declares'
          : 'is an optional parameter of the command'
      issues.push({
        message: `${site}.parameter: "${parent.parameter}" ${problem}; the parent's identifier must be one of the command's required parameters.`,
        path: ['commands', commandKey, 'parent', 'parameter'],
      })
    }
  }
  return issues
}

/**
 * The issues of every hierarchy entry, at any depth, whose `resource` is not a
 * key of `resources`. The hierarchy is the manifest's record of the app's
 * element containment, and the containment checks read it by resource key
 * (`../hierarchy-placement.ts`), so an entry naming no declared resource
 * places nothing: a misspelt key would silently exempt the resource it meant
 * from the command-parent guard and the output reference rule.
 */
function findHierarchyResourceIssues(
  manifest: Pick<AppManifest, 'resources' | 'hierarchy'>
): ManifestIssue[] {
  const issues: ManifestIssue[] = []
  const walk = (children: Record<string, HierarchyChild>, path: string[]): void => {
    for (const [key, child] of Object.entries(children)) {
      const entryPath = [...path, key]
      if (!Object.hasOwn(manifest.resources, child.resource)) {
        issues.push({
          message: `${[...entryPath, 'resource'].join('.')}: "${child.resource}" is not a resource the manifest declares; name the key of the resource whose items this collection holds.`,
          path: [...entryPath, 'resource'],
        })
      }
      if (child.children !== undefined) walk(child.children, [...entryPath, 'children'])
    }
  }
  walk(manifest.hierarchy.children, ['hierarchy', 'children'])
  return issues
}

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
  .superRefine((data, ctx) => {
    // A route string identifies one operation; two commands that resolve to
    // the same route (through `routeName`, say) would shadow each other.
    for (const { route, commandKeys } of findDuplicateRoutes(data)) {
      ctx.addIssue({
        code: 'custom',
        message: `Commands ${commandKeys.map((key) => `"${key}"`).join(', ')} all resolve to the route "${route}"; give each a distinct key or routeName.`,
        path: ['commands', commandKeys[1] ?? commandKeys[0] ?? ''],
      })
    }
    // No generated surface declares a resource marked unsupported, so a usable
    // declaration whose type names one would refer to nothing.
    for (const reference of findUnsupportedTypeReferences(data)) {
      ctx.addIssue({ code: 'custom', ...unsupportedTypeIssue(reference) })
    }
    for (const issue of findCommandParentIssues(data)) {
      ctx.addIssue({ code: 'custom', ...issue })
    }
    for (const issue of findHierarchyResourceIssues(data)) {
      ctx.addIssue({ code: 'custom', ...issue })
    }
    for (const issue of findSuperclassIssues(data.resources)) {
      ctx.addIssue({ code: 'custom', ...issue })
    }
  })
  // Read flattened: a resource that records `inherits` holds what it
  // inherits (D10, "Superclasses"), so no reader re-derives it. Flattening
  // keeps the manifest's type, so the schema stays an object schema.
  .overwrite((data) => flattenSuperclasses(data))
  .superRefine((data, ctx) => {
    // A resource's own rules hold for what it inherits too: an inherited
    // primary identifier, say, cannot be marked unsupported by the subclass.
    // Checked only on a manifest that is otherwise valid, so an issue of the
    // resource's own declarations is not reported twice.
    if (ctx.issues.length > 0) return
    // An inherited property is checked where it is used: a usable subclass of
    // an unsupported superclass must not inherit a type naming an unsupported
    // resource. Every other site was checked before flattening.
    for (const reference of findUnsupportedTypeReferences(data)) {
      const [section, key] = reference.path
      if (section !== 'resources' || typeof key !== 'string') continue
      if (data.resources[key]?.inherits === undefined) continue
      ctx.addIssue({ code: 'custom', ...unsupportedTypeIssue(reference) })
    }
    // A subclass inherits its superclass as flattened, so an issue there would
    // be reported again on every subclass; it is reported where it arises.
    const failed = new Set<string>()
    for (const [key, resource] of Object.entries(data.resources)) {
      if (resource.inherits === undefined) continue
      const checked = ResourceSchema.safeParse(resource)
      if (!checked.success) failed.add(key)
    }
    for (const key of failed) {
      if (superclassChain(key, data.resources).some((ancestor) => failed.has(ancestor))) continue
      const checked = ResourceSchema.safeParse(data.resources[key])
      for (const issue of checked.error?.issues ?? []) {
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: ['resources', key, ...issue.path],
        })
      }
    }
  })
export type AppManifest = z.infer<typeof AppManifestSchema>

/** The issue for a usable declaration whose type names an unsupported resource. */
function unsupportedTypeIssue({ site, path, resourceKey }: UnsupportedTypeReference): {
  message: string
  path: (string | number)[]
} {
  const declaration = path[0] === 'resources' ? 'the property' : 'the command'
  return {
    message: `${site}: its type names the resource "${resourceKey}", which is marked unsupported, so no generated surface declares it; change the type, or mark ${declaration} unsupported too.`,
    path: [...path],
  }
}

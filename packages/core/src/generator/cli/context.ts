import type { AppManifest, Resource, Command, Enum, HierarchyChild } from '../../manifest/index.js'
import {
  isUnsupportedResourceKey,
  usableCommands,
  usableHierarchyChildren,
  usableResources,
} from '../../manifest/unsupported.js'
import { isOperationAvailable, omittedInputs } from '../input-satisfiability.js'
import { resourceNamespace } from '../surface.js'

export interface CliGeneratorOptions {
  /** Package name (e.g., @macts/calendar) */
  packageName: string
  /** SDK package name (e.g., @macts/sdk-calendar) */
  sdkPackageName: string
  /** Package version */
  version?: string | undefined
}

export interface CliGeneratorContext {
  manifest: AppManifest
  options: CliGeneratorOptions

  /** Get a usable resource (one not marked unsupported) by name */
  getResource(name: string): Resource | undefined

  /** Get an enum by name */
  getEnum(name: string): Enum | undefined

  /** Get all resources */
  getResources(): Resource[]

  /** Get all enums */
  getEnums(): Enum[]

  /** Get commands for a resource */
  getResourceCommands(resourceName: string): Command[]

  /** Get application-level commands */
  getAppCommands(): Command[]

  /** Get application name (lowercase for CLI) */
  getAppNameLower(): string

  /** Get application class name (PascalCase) */
  getAppClassName(): string

  /**
   * Get the hierarchy as a flat list of paths, followed by one path per
   * singleton root resource, at its public segment.
   */
  getHierarchyPaths(): HierarchyPath[]

  /**
   * Whether the operation `cmd` performs on `resourceName` (`undefined` for an
   * application command) can be called. One that cannot gets no CLI command
   * (see `../input-satisfiability.ts`).
   */
  isOperationAvailable(cmd: Command, resourceName: string | undefined): boolean

  /**
   * The input fields of that operation that are left out because they admit
   * no value, so their flags are not generated.
   */
  omittedInputs(cmd: Command, resourceName: string | undefined): ReadonlySet<string>
}

/**
 * A path in the hierarchy tree.
 */
export interface HierarchyPath {
  /** CLI command path segments (e.g., ['calendars', 'events']) */
  path: string[]
  /** Resource name at this path */
  resourceName: string
  /** Whether collections can be created at this path */
  canCreate: boolean
  /** Parameter names needed to reach this path (e.g., ['calendarId'] for events) */
  parentParams: ParentParam[]
}

export interface ParentParam {
  name: string
  resourceName: string
  paramPath: string
}

export function createCliGeneratorContext(
  manifest: AppManifest,
  options: CliGeneratorOptions
): CliGeneratorContext {
  // A resource marked unsupported has no CLI commands: it is left out of the
  // resources, and its hierarchy entries (with everything under them) out of
  // the paths.
  const resourceMap = new Map(usableResources(manifest))

  const enumMap = new Map(Object.entries(manifest.enums).map(([name, enumDef]) => [name, enumDef]))

  // A command marked unsupported has no CLI command.
  const commandMap = new Map(usableCommands(manifest))

  // Build hierarchy paths
  const hierarchyPaths: HierarchyPath[] = []
  buildHierarchyPaths(manifest, manifest.hierarchy.children, [], [], hierarchyPaths)
  // A singleton root's objects are in no collection, so no hierarchy entry
  // names the resource; it is reached at its public segment, where its list
  // and its get by kind are generated as for any resource.
  for (const [resourceName, resource] of resourceMap) {
    if (resource.roots === undefined) continue
    hierarchyPaths.push({
      path: [resourceNamespace(resource)],
      resourceName,
      canCreate: false,
      parentParams: [],
    })
  }

  return {
    manifest,
    options,

    getResource(name: string): Resource | undefined {
      return resourceMap.get(name)
    },

    getEnum(name: string): Enum | undefined {
      return enumMap.get(name)
    },

    getResources(): Resource[] {
      return Array.from(resourceMap.values())
    },

    getEnums(): Enum[] {
      return Array.from(enumMap.values())
    },

    getResourceCommands(resourceName: string): Command[] {
      if (isUnsupportedResourceKey(manifest, resourceName)) return []
      return Array.from(commandMap.values()).filter((cmd) => {
        if (cmd.scope !== 'resource') return false
        if (!cmd.resourceType) return true
        if (Array.isArray(cmd.resourceType)) {
          return cmd.resourceType.includes(resourceName)
        }
        return cmd.resourceType === resourceName
      })
    },

    getAppCommands(): Command[] {
      return Array.from(commandMap.values()).filter((cmd) => cmd.scope === 'application')
    },

    getAppNameLower(): string {
      return manifest.app.name.replace(/\s+/g, '-').toLowerCase()
    },

    getAppClassName(): string {
      return manifest.app.name.replace(/\s+/g, '')
    },

    getHierarchyPaths(): HierarchyPath[] {
      return hierarchyPaths
    },

    isOperationAvailable(cmd: Command, resourceName: string | undefined): boolean {
      return isOperationAvailable(manifest, cmd, resourceName)
    },

    omittedInputs(cmd: Command, resourceName: string | undefined): ReadonlySet<string> {
      return omittedInputs(manifest, cmd, resourceName)
    },
  }
}

/**
 * Build a flat list of hierarchy paths from the tree, leaving out the entries
 * of resources marked unsupported and everything nested under them.
 */
function buildHierarchyPaths(
  manifest: AppManifest,
  children: Record<string, HierarchyChild>,
  currentPath: string[],
  parentParams: ParentParam[],
  result: HierarchyPath[]
): void {
  for (const [key, child] of usableHierarchyChildren(manifest, children)) {
    const newPath = [...currentPath, key]
    const canCreate = child.access === 'rw'

    result.push({
      path: newPath,
      resourceName: child.resource,
      canCreate,
      parentParams: [...parentParams],
    })

    // Process children with this resource as a parent parameter
    if (child.children) {
      const newParentParams: ParentParam[] = [
        ...parentParams,
        {
          name: `${toCamelCase(child.resource)}Id`,
          resourceName: child.resource,
          paramPath: newPath.join('/'),
        },
      ]
      buildHierarchyPaths(manifest, child.children, newPath, newParentParams, result)
    }
  }
}

/**
 * Convert PascalCase to camelCase.
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

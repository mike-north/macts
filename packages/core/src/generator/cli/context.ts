import type { AppManifest, Resource, Command, Enum, HierarchyChild } from '../../manifest/index.js'

export interface CliGeneratorOptions {
  /** Package name (e.g., @macts/cli-calendar) */
  packageName: string
  /** SDK package name (e.g., @macts/sdk-calendar) */
  sdkPackageName: string
  /** Package version */
  version?: string | undefined
}

export interface CliGeneratorContext {
  manifest: AppManifest
  options: CliGeneratorOptions

  /** Get a resource by name */
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

  /** Get the hierarchy as a flat list of paths */
  getHierarchyPaths(): HierarchyPath[]
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
  const resourceMap = new Map(
    Object.entries(manifest.resources).map(([name, resource]) => [name, resource])
  )

  const enumMap = new Map(Object.entries(manifest.enums).map(([name, enumDef]) => [name, enumDef]))

  const commandMap = new Map(Object.entries(manifest.commands).map(([name, cmd]) => [name, cmd]))

  // Build hierarchy paths
  const hierarchyPaths: HierarchyPath[] = []
  buildHierarchyPaths(manifest.hierarchy.children, [], [], hierarchyPaths)

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
  }
}

/**
 * Build a flat list of hierarchy paths from the tree.
 */
function buildHierarchyPaths(
  children: Record<string, HierarchyChild>,
  currentPath: string[],
  parentParams: ParentParam[],
  result: HierarchyPath[]
): void {
  for (const [key, child] of Object.entries(children)) {
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
      buildHierarchyPaths(child.children, newPath, newParentParams, result)
    }
  }
}

/**
 * Convert PascalCase to camelCase.
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

import type { AppManifest, Resource, Command, Enum } from '../manifest/index.js'

export interface GeneratorOptions {
  /** Output directory for generated code */
  outDir: string
  /** Package name (e.g., @macts/sdk-calendar) */
  packageName: string
  /** Package version */
  version?: string | undefined
  /** Format output with Prettier */
  format?: boolean | undefined
  /** Generate source maps */
  sourceMaps?: boolean | undefined
}

export interface GeneratorContext {
  manifest: AppManifest
  options: GeneratorOptions

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
}

export function createGeneratorContext(
  manifest: AppManifest,
  options: GeneratorOptions
): GeneratorContext {
  const resourceMap = new Map(
    Object.entries(manifest.resources).map(([name, resource]) => [name, resource])
  )

  const enumMap = new Map(Object.entries(manifest.enums).map(([name, enumDef]) => [name, enumDef]))

  const commandMap = new Map(Object.entries(manifest.commands).map(([name, cmd]) => [name, cmd]))

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
        if (!cmd.resourceType) return true // Applies to all resources
        if (Array.isArray(cmd.resourceType)) {
          return cmd.resourceType.includes(resourceName)
        }
        return cmd.resourceType === resourceName
      })
    },

    getAppCommands(): Command[] {
      return Array.from(commandMap.values()).filter((cmd) => cmd.scope === 'application')
    },
  }
}

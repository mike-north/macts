import { createRequire } from 'node:module'
import type { CliPlugin, PluginDiscoveryResult, PluginLoadError } from './types.js'
import { readPluginCache, writePluginCache, type CachedPlugin } from './cache.js'
import { findInstalledPluginPackages, getPluginResolutionPath } from './manager.js'

/**
 * Pattern for CLI plugin package names.
 * Plugins must be scoped under @macts/* (excluding infrastructure packages and server packages).
 */
const PLUGIN_PACKAGE_PATTERN = /^@macts\/([a-z0-9-]+)$/

/**
 * Infrastructure packages that are not CLI plugins.
 */
const INFRASTRUCTURE_PACKAGES = new Set(['core', 'api', 'cli', 'mcp'])

/**
 * Discover and load all available CLI plugins.
 *
 * Plugins are installed via `macts plugin install` into ~/.macts/plugins/.
 * Uses npm's package-lock.json hash to cache plugin metadata for fast startup.
 *
 * @returns Discovery result with loaded plugins and any errors
 */
export async function discoverPlugins(): Promise<PluginDiscoveryResult> {
  const plugins: CliPlugin[] = []
  const errors: PluginLoadError[] = []

  // Try to use cached plugin list (fast path)
  const cached = readPluginCache()
  if (cached) {
    // Load plugins from cache
    for (const entry of cached) {
      const result = await loadPlugin(entry.packageName)
      if (result.success) {
        plugins.push(result.plugin)
      } else {
        errors.push({ packageName: entry.packageName, message: result.error })
      }
    }
    return { plugins, errors }
  }

  // Cache miss - scan plugins directory (slow path)
  const packageNames = findInstalledPluginPackages()

  const cacheEntries: CachedPlugin[] = []

  for (const packageName of packageNames) {
    const result = await loadPlugin(packageName)
    if (result.success) {
      plugins.push(result.plugin)
      cacheEntries.push({
        packageName,
        name: result.plugin.name,
        description: result.plugin.description,
      })
    } else {
      errors.push({ packageName, message: result.error })
    }
  }

  // Update cache for next time
  if (cacheEntries.length > 0) {
    writePluginCache(cacheEntries)
  }

  return { plugins, errors }
}

/**
 * Load a single plugin by package name.
 *
 * Resolves the plugin from the managed ~/.macts/plugins/node_modules directory.
 *
 * @param packageName - npm package name (e.g., '@macts/calendar')
 * @returns Result with plugin or error
 */
export async function loadPlugin(
  packageName: string
): Promise<{ success: true; plugin: CliPlugin } | { success: false; error: string }> {
  // Validate package name
  const match = PLUGIN_PACKAGE_PATTERN.exec(packageName)
  const name = match?.[1]
  if (!name || INFRASTRUCTURE_PACKAGES.has(name) || name.endsWith('-server')) {
    return { success: false, error: `Invalid plugin package name: ${packageName}` }
  }

  try {
    // Resolve plugin from managed plugins directory using the /cli subpath export
    const subpath = `${packageName}/cli`
    const pluginsPath = getPluginResolutionPath()
    let modulePath: string

    if (pluginsPath) {
      // Create a require function that resolves from the plugins directory
      const pluginRequire = createRequire(`${pluginsPath}/.`)
      modulePath = pluginRequire.resolve(subpath)
    } else {
      // Fall back to normal resolution (for development)
      modulePath = subpath
    }

    // Dynamic import of the plugin module
    const module = (await import(modulePath)) as { plugin?: unknown }

    // Check for plugin export
    if (!module.plugin) {
      return { success: false, error: `Package ${packageName} does not export a 'plugin' object` }
    }

    // Validate plugin shape
    const plugin = module.plugin as CliPlugin
    if (!isValidPlugin(plugin)) {
      return { success: false, error: `Package ${packageName} exports an invalid plugin object` }
    }

    return { success: true, plugin }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

/**
 * Validate that an object is a valid CliPlugin.
 */
function isValidPlugin(obj: unknown): obj is CliPlugin {
  if (!obj || typeof obj !== 'object') return false

  const plugin = obj as Record<string, unknown>

  return (
    typeof plugin['name'] === 'string' &&
    typeof plugin['description'] === 'string' &&
    Array.isArray(plugin['commands'])
  )
}

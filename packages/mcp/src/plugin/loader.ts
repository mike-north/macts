/**
 * MCP plugin discovery and loading.
 *
 * @packageDocumentation
 */

import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { McpPlugin } from '../types.js'
import type { PluginDiscoveryResult, PluginLoadError } from './types.js'
import { readMcpPluginCache, writeMcpPluginCache, type CachedPlugin } from './cache.js'
import { getPluginsNodeModules } from './paths.js'

/**
 * Pattern for MCP plugin package names.
 * Plugins must be scoped under @macts/*-server for security.
 */
const PLUGIN_PACKAGE_PATTERN = /^@macts\/([a-z0-9-]+-server)$/

/**
 * Get the node_modules path for plugin resolution.
 *
 * @returns Path to plugins node_modules, or null if not initialized
 */
function getPluginResolutionPath(): string | null {
  const nodeModules = getPluginsNodeModules()
  if (existsSync(nodeModules)) {
    return nodeModules
  }
  return null
}

/**
 * Find MCP plugin packages in the plugins node_modules.
 *
 * @returns Array of package names
 */
function findInstalledMcpPluginPackages(): string[] {
  const nodeModules = getPluginsNodeModules()

  if (!existsSync(nodeModules)) {
    return []
  }

  const mactsScope = join(nodeModules, '@macts')
  if (!existsSync(mactsScope)) {
    return []
  }

  try {
    const entries = readdirSync(mactsScope)
    return entries.filter((entry) => entry.endsWith('-server')).map((entry) => `@macts/${entry}`)
  } catch {
    return []
  }
}

/**
 * Discover and load all available MCP plugins.
 *
 * Plugins are installed via the CLI plugin manager into ~/.macts/plugins/.
 * Uses npm's package-lock.json hash to cache plugin metadata for fast startup.
 *
 * @returns Discovery result with loaded plugins and any errors
 */
export async function discoverMcpPlugins(): Promise<PluginDiscoveryResult> {
  const plugins: McpPlugin[] = []
  const errors: PluginLoadError[] = []

  // Try to use cached plugin list (fast path)
  const cached = readMcpPluginCache()
  if (cached) {
    // Load plugins from cache
    for (const entry of cached) {
      const result = await loadMcpPlugin(entry.packageName)
      if (result.success) {
        plugins.push(result.plugin)
      } else {
        errors.push({ packageName: entry.packageName, message: result.error })
      }
    }
    return { plugins, errors }
  }

  // Cache miss - scan plugins directory (slow path)
  const packageNames = findInstalledMcpPluginPackages()

  const cacheEntries: CachedPlugin[] = []

  for (const packageName of packageNames) {
    const result = await loadMcpPlugin(packageName)
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
    writeMcpPluginCache(cacheEntries)
  }

  return { plugins, errors }
}

/**
 * Load a single MCP plugin by package name.
 *
 * Resolves the plugin from the managed ~/.macts/plugins/node_modules directory.
 *
 * @param packageName - npm package name (e.g., '@macts/calendar-server')
 * @returns Result with plugin or error
 */
export async function loadMcpPlugin(
  packageName: string
): Promise<{ success: true; plugin: McpPlugin } | { success: false; error: string }> {
  // Validate package name
  if (!PLUGIN_PACKAGE_PATTERN.test(packageName)) {
    return { success: false, error: `Invalid MCP plugin package name: ${packageName}` }
  }

  try {
    // Resolve plugin from managed plugins directory using the /mcp subpath export
    const subpath = `${packageName}/mcp`
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
    const plugin = module.plugin as McpPlugin
    if (!isValidMcpPlugin(plugin)) {
      return { success: false, error: `Package ${packageName} exports an invalid plugin object` }
    }

    return { success: true, plugin }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

/**
 * Validate that an object is a valid McpPlugin.
 *
 * Performs deep validation of plugin structure including tool definitions.
 */
function isValidMcpPlugin(obj: unknown): obj is McpPlugin {
  if (!obj || typeof obj !== 'object') return false

  const plugin = obj as Record<string, unknown>

  if (typeof plugin['name'] !== 'string') return false
  if (typeof plugin['description'] !== 'string') return false
  if (!Array.isArray(plugin['tools'])) return false

  // Validate each tool structure
  const tools = plugin['tools'] as unknown[]
  return tools.every((tool) => {
    if (!tool || typeof tool !== 'object') return false
    const t = tool as Record<string, unknown>
    return (
      typeof t['name'] === 'string' &&
      typeof t['description'] === 'string' &&
      typeof t['inputSchema'] === 'object' &&
      t['inputSchema'] !== null &&
      typeof t['handler'] === 'function'
    )
  })
}

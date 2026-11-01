import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type {
  CliPlugin,
  LoadPluginResult,
  PluginDiscoveryResult,
  PluginLoadError,
} from './types.js'
import { readPluginCache, writePluginCache, type CachedPlugin } from './cache.js'
import { findInstalledPluginPackages, getPluginResolutionPath } from './manager.js'
import { isRecord, resolvePackageExport, type PackageExportResolution } from './package-exports.js'

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
        errors.push({
          packageName: entry.packageName,
          reason: result.reason,
          message: result.error,
        })
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
      errors.push({ packageName, reason: result.reason, message: result.error })
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
export async function loadPlugin(packageName: string): Promise<LoadPluginResult> {
  // Validate package name
  const match = PLUGIN_PACKAGE_PATTERN.exec(packageName)
  const name = match?.[1]
  if (!name || INFRASTRUCTURE_PACKAGES.has(name) || name.endsWith('-server')) {
    return {
      success: false,
      reason: 'load-error',
      error: `Invalid plugin package name: ${packageName}`,
    }
  }

  const pluginsPath = getPluginResolutionPath()

  if (pluginsPath) {
    const resolution = resolveCliEntryUrl(pluginsPath, packageName)
    if (!resolution.found) {
      return { success: false, reason: resolution.reason, error: resolution.error }
    }

    try {
      const module = await importModule(resolution.url)
      return validatePluginModule(packageName, module)
    } catch (error) {
      // The package and its './cli' file both exist on disk (we just checked),
      // so any failure here is a genuine load-time break (syntax error, a
      // missing transitive dependency, a throw at module-init time, etc.),
      // never "not installed".
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, reason: 'load-error', error: message }
    }
  }

  // Fall back to normal Node module resolution (for development, where the
  // plugin lives in this process's own node_modules rather than the managed
  // plugins directory).
  //
  // Resolution and execution are deliberately separate steps here.
  // `import.meta.resolve` resolves the specifier WITHOUT executing the
  // module, so a failure there means the package itself genuinely cannot be
  // found ('not-installed'). Once resolution succeeds, any failure from the
  // subsequent `import()` — including an ERR_MODULE_NOT_FOUND thrown while
  // the package's own code resolves one of ITS dependencies (e.g. a missing
  // transitive dependency like `clipanion`) — is a load-time break in an
  // installed package, never "not installed". Collapsing these two failure
  // modes together (as a single try/catch around both resolve-and-import
  // would) is the exact bug this function exists to avoid: an
  // installed-but-broken plugin would otherwise be silently misreported as
  // "not installed" and its warning suppressed.
  const specifier = `${packageName}/cli`
  let resolvedUrl: string
  try {
    resolvedUrl = import.meta.resolve(specifier)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, reason: 'not-installed', error: message }
  }

  try {
    const module = await importModule(resolvedUrl)
    return validatePluginModule(packageName, module)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, reason: 'load-error', error: message }
  }
}

/**
 * Dynamically import a module.
 *
 * The result is deliberately `unknown`: nothing about a third-party plugin's
 * entry point is known until it has been validated.
 */
async function importModule(specifier: string): Promise<unknown> {
  return await import(specifier)
}

/**
 * Validate a loaded plugin module's shape.
 */
function validatePluginModule(packageName: string, module: unknown): LoadPluginResult {
  if (!isRecord(module) || !module['plugin']) {
    return {
      success: false,
      reason: 'load-error',
      error: `Package ${packageName} does not export a 'plugin' object`,
    }
  }

  // `isValidPlugin` is a type guard, so the narrowed value carries the
  // CliPlugin type without an assertion.
  const plugin = module['plugin']
  if (!isValidPlugin(plugin)) {
    return {
      success: false,
      reason: 'load-error',
      error: `Package ${packageName} exports an invalid plugin object`,
    }
  }

  return { success: true, plugin }
}

/**
 * Resolve the `./cli` subpath export of a plugin package to an absolute
 * `file:` URL, reading the package's `exports` map directly rather than
 * going through Node's CJS `require.resolve` (which only matches the
 * `"require"` condition and unconditionally fails for the ESM-only
 * `@macts/<app>` packages, which declare only `"types"` and `"import"`).
 *
 * @param pluginsPath - Absolute path to the managed plugins `node_modules` directory
 * @param packageName - npm package name (e.g., '@macts/calendar')
 */
function resolveCliEntryUrl(pluginsPath: string, packageName: string): PackageExportResolution {
  // packageName is always `@macts/<app>`; join() handles the embedded '/'
  // correctly, landing on <pluginsPath>/@macts/<app>.
  const packageDir = join(pluginsPath, packageName)

  if (!existsSync(packageDir)) {
    return {
      found: false,
      reason: 'not-installed',
      error: `Package ${packageName} is not installed in the plugins directory`,
    }
  }

  return resolvePackageExport(packageDir, packageName, './cli')
}

/**
 * Validate that an object is a valid CliPlugin.
 */
function isValidPlugin(obj: unknown): obj is CliPlugin {
  if (!isRecord(obj)) return false

  const plugin = obj

  return (
    typeof plugin['name'] === 'string' &&
    typeof plugin['description'] === 'string' &&
    Array.isArray(plugin['commands'])
  )
}

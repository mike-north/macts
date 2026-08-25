import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  CliPlugin,
  LoadPluginResult,
  PluginDiscoveryResult,
  PluginLoadError,
} from './types.js'
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
 * Dynamically import a module, typed for the shape a plugin entry point
 * is expected to export.
 */
async function importModule(specifier: string): Promise<{ plugin?: unknown }> {
  return (await import(specifier)) as { plugin?: unknown }
}

/**
 * Validate a loaded plugin module's shape.
 */
function validatePluginModule(packageName: string, module: { plugin?: unknown }): LoadPluginResult {
  if (!module.plugin) {
    return {
      success: false,
      reason: 'load-error',
      error: `Package ${packageName} does not export a 'plugin' object`,
    }
  }

  const plugin = module.plugin as CliPlugin
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
 * Result of resolving a plugin's `./cli` export to an importable file URL.
 */
type CliEntryResolution =
  | { found: true; url: string }
  | { found: false; reason: 'not-installed' | 'load-error'; error: string }

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
function resolveCliEntryUrl(pluginsPath: string, packageName: string): CliEntryResolution {
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

  const packageJsonPath = join(packageDir, 'package.json')
  let pkg: { exports?: unknown }
  try {
    pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { exports?: unknown }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      found: false,
      reason: 'load-error',
      error: `Failed to read package.json for ${packageName}: ${message}`,
    }
  }

  const cliEntry = resolveExportsSubpath(pkg.exports, './cli')
  if (!cliEntry) {
    return {
      found: false,
      reason: 'load-error',
      error: `Package ${packageName} does not define a './cli' export (or none of its conditions include "import" or "default")`,
    }
  }

  const validatedTarget = validateExportsTarget(packageName, packageDir, cliEntry)
  if (!validatedTarget.ok) {
    return { found: false, reason: 'load-error', error: validatedTarget.error }
  }

  const resolvedPath = validatedTarget.path
  if (!existsSync(resolvedPath)) {
    return {
      found: false,
      reason: 'load-error',
      error: `Package ${packageName}'s './cli' export points to a missing file: ${cliEntry}`,
    }
  }

  return { found: true, url: pathToFileURL(resolvedPath).href }
}

/**
 * Result of validating an `exports` map target string.
 */
type ExportsTargetValidation = { ok: true; path: string } | { ok: false; error: string }

/**
 * Validate an `exports` map target string against Node's own constraints on
 * package-target values, then resolve it to an absolute path within
 * `packageDir`.
 *
 * Reading the `exports` map by hand (see {@link resolveCliEntryUrl}) means we
 * bypass Node's built-in resolver entirely — including the validation Node
 * would otherwise perform on the target string before ever touching the
 * filesystem. A malicious or malformed target (a bare specifier, an absolute
 * path, or a `../` escape) must be rejected here for the same reason Node
 * itself rejects it: an `exports` target is only ever supposed to point
 * somewhere inside the package that declares it.
 *
 * @see https://nodejs.org/api/packages.html#exports-sugar
 * @see https://nodejs.org/api/esm.html#resolution-algorithm-specification
 */
function validateExportsTarget(
  packageName: string,
  packageDir: string,
  target: string
): ExportsTargetValidation {
  const invalid = (detail: string): ExportsTargetValidation => ({
    ok: false,
    error: `Package ${packageName}'s './cli' export target ${JSON.stringify(target)} is invalid: ${detail}`,
  })

  // Node's PACKAGE_TARGET_RESOLVE requires a target to be a string starting
  // with "./"; anything else (a bare specifier, an absolute path like
  // "/abs/path.js", or a "../" escape) is ERR_INVALID_PACKAGE_TARGET.
  if (!target.startsWith('./')) {
    return invalid('exports targets must be relative paths beginning with "./"')
  }

  // Beyond the leading "./", Node also rejects any "." or ".." segment (which
  // would otherwise let a target escape the package directory) and any
  // "node_modules" segment.
  const segments = target.split('/').slice(1)
  const hasForbiddenSegment = segments.some(
    (segment) =>
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.toLowerCase() === 'node_modules'
  )
  if (hasForbiddenSegment) {
    return invalid('exports targets must not contain "..", ".", or "node_modules" path segments')
  }

  // Defense in depth: confirm the normalized, resolved path is still inside
  // packageDir. Comparing against packageDir plus a trailing separator
  // ensures a sibling directory with a shared prefix (e.g. "packageDir-evil")
  // can't pass this check.
  const resolvedPath = resolve(packageDir, target)
  const packageDirWithSep = packageDir.endsWith(sep) ? packageDir : `${packageDir}${sep}`
  if (resolvedPath !== packageDir && !resolvedPath.startsWith(packageDirWithSep)) {
    return invalid('resolves outside the package directory')
  }

  return { ok: true, path: resolvedPath }
}

/**
 * Resolve a subpath in a package's `exports` map to a relative file path,
 * preferring the `"import"` condition (these packages are ESM-only) and
 * falling back to `"default"` when present. Handles both the string and
 * conditions-object forms of an exports entry.
 */
function resolveExportsSubpath(exportsField: unknown, subpath: string): string | null {
  if (!exportsField || typeof exportsField !== 'object') return null
  const entry = (exportsField as Record<string, unknown>)[subpath]
  return resolveExportsConditions(entry)
}

/**
 * Resolve an individual exports entry value (as found at a subpath key) to a
 * relative file path string.
 */
function resolveExportsConditions(entry: unknown): string | null {
  if (typeof entry === 'string') return entry

  if (entry && typeof entry === 'object') {
    const conditions = entry as Record<string, unknown>
    const candidate = conditions['import'] ?? conditions['default']
    if (typeof candidate === 'string') return candidate
    // Conditions may themselves nest further conditions (e.g. `"import": { "default": ... }`).
    return resolveExportsConditions(candidate)
  }

  return null
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

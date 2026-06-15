/**
 * Plugin manager for installing and uninstalling plugins.
 *
 * @packageDocumentation
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { getPluginsDir, getPluginsPackageJson, getPluginsNodeModules } from './paths.js'
import { invalidatePluginCache } from './cache.js'

/**
 * Pattern for valid CLI plugin package names.
 * Must be scoped under @macts/* (excluding infrastructure packages and server packages).
 */
const PLUGIN_PACKAGE_PATTERN = /^@macts\/([a-z0-9-]+)$/

/**
 * Pattern for valid MCP server plugin package names.
 *
 * MCP server plugins are scoped under `@macts/<app>-server`. The captured group
 * is the bare app name (without the `-server` suffix), used to validate that an
 * actual app name is present (rejecting a bare `@macts/-server`).
 */
const SERVER_PLUGIN_PACKAGE_PATTERN = /^@macts\/([a-z0-9-]+)-server$/

/**
 * Infrastructure packages that are not CLI plugins.
 */
const INFRASTRUCTURE_PACKAGES = new Set(['core', 'api', 'cli', 'mcp'])

/**
 * Pattern for valid version specifiers.
 * Allows semver versions, tags, and ranges - but not URLs, git refs, or file paths.
 */
const VERSION_PATTERN = /^[a-z0-9._\-^~>=<*| ]+$/i

/**
 * Result of a plugin installation.
 */
export interface InstallResult {
  readonly success: boolean
  readonly message: string
}

/**
 * Result of a plugin uninstallation.
 */
export interface UninstallResult {
  readonly success: boolean
  readonly message: string
}

/**
 * Installed plugin info.
 */
export interface InstalledPlugin {
  readonly packageName: string
  readonly version: string
}

/**
 * Initialize the plugins directory if needed.
 *
 * Creates ~/.macts/plugins/ with a package.json.
 */
export function initializePluginsDir(): void {
  const pluginsDir = getPluginsDir()
  const packageJsonPath = getPluginsPackageJson()

  if (!existsSync(pluginsDir)) {
    mkdirSync(pluginsDir, { recursive: true })
  }

  if (!existsSync(packageJsonPath)) {
    const packageJson = {
      name: 'macts-plugins',
      version: '1.0.0',
      private: true,
      description: 'macts CLI plugins',
      dependencies: {},
    }
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  }
}

/**
 * Resolve a user-supplied MCP server plugin identifier to its full package name.
 *
 * Accepts either a bare app name (e.g. `calendar`) or the fully-qualified server
 * package name (e.g. `@macts/calendar-server`). Both resolve to the same package
 * so users can install an app's MCP capability without remembering the scope or
 * the `-server` suffix.
 *
 * @param app - Bare app name or full `@macts/<app>-server` package name
 * @returns The resolved package name, or null if the input is not a valid app/package name
 *
 * @example
 * ```typescript
 * resolveMcpServerPackageName('calendar');             // '@macts/calendar-server'
 * resolveMcpServerPackageName('@macts/calendar-server'); // '@macts/calendar-server'
 * resolveMcpServerPackageName('@other/calendar-server'); // null (wrong scope)
 * ```
 */
export function resolveMcpServerPackageName(app: string): string | null {
  // Already a fully-qualified @macts/<app>-server name
  const serverMatch = SERVER_PLUGIN_PACKAGE_PATTERN.exec(app)?.[1]
  if (serverMatch && !INFRASTRUCTURE_PACKAGES.has(serverMatch)) {
    return `@macts/${serverMatch}-server`
  }

  // Bare app name (e.g. "calendar"). Reject scoped names, server suffixes,
  // and infrastructure names so we only synthesize from a plain app slug.
  if (/^[a-z0-9-]+$/.test(app) && !app.endsWith('-server') && !INFRASTRUCTURE_PACKAGES.has(app)) {
    return `@macts/${app}-server`
  }

  return null
}

/**
 * Run `npm install` for a package spec inside the plugins directory.
 *
 * Shared implementation behind {@link installPlugin} (CLI plugins) and
 * {@link installMcpServerPlugin} (MCP server plugins). Both plugin kinds live in
 * the same managed `~/.macts/plugins` directory; discovery distinguishes them by
 * package-name suffix (CLI loads `@macts/<app>`, MCP loads `@macts/<app>-server`).
 *
 * @param packageName - Validated npm package name
 * @param version - Validated version specifier
 * @returns Installation result
 */
function runNpmInstall(packageName: string, version: string): InstallResult {
  // Validate version specifier for security (prevent URLs, git refs, file paths)
  if (!VERSION_PATTERN.test(version)) {
    return {
      success: false,
      message: `Invalid version specifier: ${version}. Must be a semver version or tag.`,
    }
  }

  // Initialize plugins directory
  initializePluginsDir()

  const pluginsDir = getPluginsDir()
  const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`

  // Use spawnSync with args array to prevent command injection
  // --ignore-scripts prevents malicious install hooks from running
  const result = spawnSync('npm', ['install', '--ignore-scripts', packageSpec], {
    cwd: pluginsDir,
    stdio: 'pipe',
    encoding: 'utf-8',
  })

  if (result.status !== 0) {
    const errorOutput = result.stderr || result.stdout || 'Unknown error'
    return {
      success: false,
      message: `Failed to install ${packageSpec}: ${errorOutput}`,
    }
  }

  // Invalidate cache so plugins are rediscovered
  invalidatePluginCache()

  return {
    success: true,
    message: `Installed ${packageSpec}`,
  }
}

/**
 * Install a CLI plugin.
 *
 * Installs an `@macts/<app>` package (SDK + CLI plugin) into `~/.macts/plugins`
 * so the CLI discovers its commands. Server packages (`@macts/<app>-server`) are
 * rejected here — use {@link installMcpServerPlugin} (`macts mcp install`) for
 * those so they land where the MCP daemon discovers them.
 *
 * @param packageName - npm package name (e.g., "@macts/calendar")
 * @param version - Optional version specifier (default: "latest")
 * @returns Installation result
 */
export function installPlugin(packageName: string, version = 'latest'): InstallResult {
  // Validate package name for security
  const name = PLUGIN_PACKAGE_PATTERN.exec(packageName)?.[1]
  if (!name || INFRASTRUCTURE_PACKAGES.has(name) || name.endsWith('-server')) {
    return {
      success: false,
      message: `Invalid plugin package name: ${packageName}. Must match @macts/* (excluding infrastructure and server packages)`,
    }
  }

  return runNpmInstall(packageName, version)
}

/**
 * Install an MCP server plugin.
 *
 * Installs an `@macts/<app>-server` package (HTTP API + MCP plugin) into the same
 * managed `~/.macts/plugins` directory that CLI plugins use. The MCP daemon
 * discovers server packages there (via `discoverMcpPlugins` in `@macts/mcp`), so
 * after installing, `macts mcp start` exposes that app's tools to MCP clients.
 *
 * Accepts either a bare app name (`calendar`) or the full package name
 * (`@macts/calendar-server`); see {@link resolveMcpServerPackageName}.
 *
 * @param app - Bare app name or full `@macts/<app>-server` package name
 * @param version - Optional version specifier (default: "latest")
 * @returns Installation result
 */
export function installMcpServerPlugin(app: string, version = 'latest'): InstallResult {
  const packageName = resolveMcpServerPackageName(app)
  if (!packageName) {
    return {
      success: false,
      message: `Invalid MCP server plugin: ${app}. Provide an app name (e.g. "calendar") or a full package name (e.g. "@macts/calendar-server").`,
    }
  }

  return runNpmInstall(packageName, version)
}

/**
 * Run `npm uninstall` for a package inside the plugins directory.
 *
 * Shared implementation behind {@link uninstallPlugin} and
 * {@link uninstallMcpServerPlugin}.
 *
 * @param packageName - Validated npm package name
 * @returns Uninstallation result
 */
function runNpmUninstall(packageName: string): UninstallResult {
  const pluginsDir = getPluginsDir()
  const packageJsonPath = getPluginsPackageJson()

  // Check if plugins directory exists
  if (!existsSync(packageJsonPath)) {
    return {
      success: false,
      message: `Plugin ${packageName} is not installed`,
    }
  }

  // Use spawnSync with args array to prevent command injection
  const result = spawnSync('npm', ['uninstall', packageName], {
    cwd: pluginsDir,
    stdio: 'pipe',
    encoding: 'utf-8',
  })

  if (result.status !== 0) {
    const errorOutput = result.stderr || result.stdout || 'Unknown error'
    return {
      success: false,
      message: `Failed to uninstall ${packageName}: ${errorOutput}`,
    }
  }

  // Invalidate cache
  invalidatePluginCache()

  return {
    success: true,
    message: `Uninstalled ${packageName}`,
  }
}

/**
 * Uninstall a CLI plugin.
 *
 * @param packageName - npm package name (e.g., "@macts/calendar")
 * @returns Uninstallation result
 */
export function uninstallPlugin(packageName: string): UninstallResult {
  // Validate package name
  const name = PLUGIN_PACKAGE_PATTERN.exec(packageName)?.[1]
  if (!name || INFRASTRUCTURE_PACKAGES.has(name) || name.endsWith('-server')) {
    return {
      success: false,
      message: `Invalid plugin package name: ${packageName}. Must match @macts/* (excluding infrastructure and server packages)`,
    }
  }

  return runNpmUninstall(packageName)
}

/**
 * Uninstall an MCP server plugin.
 *
 * Accepts either a bare app name (`calendar`) or the full package name
 * (`@macts/calendar-server`); see {@link resolveMcpServerPackageName}.
 *
 * @param app - Bare app name or full `@macts/<app>-server` package name
 * @returns Uninstallation result
 */
export function uninstallMcpServerPlugin(app: string): UninstallResult {
  const packageName = resolveMcpServerPackageName(app)
  if (!packageName) {
    return {
      success: false,
      message: `Invalid MCP server plugin: ${app}. Provide an app name (e.g. "calendar") or a full package name (e.g. "@macts/calendar-server").`,
    }
  }

  return runNpmUninstall(packageName)
}

/**
 * List installed plugins.
 *
 * @returns Array of installed plugins
 */
export function listInstalledPlugins(): InstalledPlugin[] {
  const packageJsonPath = getPluginsPackageJson()

  if (!existsSync(packageJsonPath)) {
    return []
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    const pkg = JSON.parse(content) as { dependencies?: Record<string, string> }

    if (!pkg.dependencies) {
      return []
    }

    return Object.entries(pkg.dependencies)
      .filter(([pkgName]) => {
        const matched = PLUGIN_PACKAGE_PATTERN.exec(pkgName)?.[1]
        return (
          matched != null && !INFRASTRUCTURE_PACKAGES.has(matched) && !matched.endsWith('-server')
        )
      })
      .map(([packageName, version]) => ({ packageName, version }))
  } catch {
    return []
  }
}

/**
 * List installed MCP server plugins.
 *
 * Reads the managed plugins `package.json` and returns the `@macts/<app>-server`
 * dependencies — the packages the MCP daemon discovers and loads.
 *
 * @returns Array of installed MCP server plugins
 */
export function listInstalledMcpServerPlugins(): InstalledPlugin[] {
  const packageJsonPath = getPluginsPackageJson()

  if (!existsSync(packageJsonPath)) {
    return []
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    const pkg = JSON.parse(content) as { dependencies?: Record<string, string> }

    if (!pkg.dependencies) {
      return []
    }

    return Object.entries(pkg.dependencies)
      .filter(([pkgName]) => {
        const matched = SERVER_PLUGIN_PACKAGE_PATTERN.exec(pkgName)?.[1]
        return matched != null && !INFRASTRUCTURE_PACKAGES.has(matched)
      })
      .map(([packageName, version]) => ({ packageName, version }))
  } catch {
    return []
  }
}

/**
 * Get the node_modules path for plugin resolution.
 *
 * @returns Path to plugins node_modules, or null if not initialized
 */
export function getPluginResolutionPath(): string | null {
  const nodeModules = getPluginsNodeModules()
  if (existsSync(nodeModules)) {
    return nodeModules
  }
  return null
}

/**
 * Find plugin packages in the plugins node_modules.
 *
 * @returns Array of package names
 */
export function findInstalledPluginPackages(): string[] {
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
    return entries
      .filter((entry) => !entry.endsWith('-server') && !INFRASTRUCTURE_PACKAGES.has(entry))
      .map((entry) => `@macts/${entry}`)
  } catch {
    return []
  }
}

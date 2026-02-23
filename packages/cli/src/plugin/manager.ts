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
 * Install a plugin.
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
 * Uninstall a plugin.
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
        return matched != null && !INFRASTRUCTURE_PACKAGES.has(matched) && !matched.endsWith('-server')
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

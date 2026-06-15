/**
 * Plugin directory paths and configuration utilities.
 *
 * Provides functions for locating macts configuration directories,
 * plugin installation paths, and cache files. All paths respect the
 * MACTS_HOME environment variable for custom installations.
 *
 * @packageDocumentation
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Get the base directory for macts configuration and plugins.
 *
 * Returns the directory where macts stores all configuration, plugins,
 * API keys, and other data. Can be overridden with the MACTS_HOME
 * environment variable.
 *
 * @returns Absolute path to macts home directory
 *
 * @defaultValue `~/.macts`
 *
 * @example
 * ```typescript
 * import { getMactsHome } from '@macts/cli';
 *
 * const home = getMactsHome();
 * console.log(`macts home: ${home}`);
 * // Output: macts home: /Users/username/.macts
 *
 * // With custom MACTS_HOME
 * process.env.MACTS_HOME = '/custom/path';
 * console.log(getMactsHome());
 * // Output: /custom/path
 * ```
 */
export function getMactsHome(): string {
  return process.env['MACTS_HOME'] ?? join(homedir(), '.macts')
}

/**
 * Get the directory where CLI plugins are installed.
 *
 * Returns the path to the plugins directory which contains a package.json,
 * package-lock.json, and node_modules with installed plugin packages.
 * Plugins are managed via npm in this directory.
 *
 * @returns Absolute path to plugins directory
 *
 * @example
 * ```typescript
 * import { getPluginsDir } from '@macts/cli';
 *
 * const pluginsDir = getPluginsDir();
 * console.log(`Plugins: ${pluginsDir}`);
 * // Output: Plugins: /Users/username/.macts/plugins
 *
 * // Structure:
 * // ~/.macts/plugins/
 * // ├── package.json
 * // ├── package-lock.json
 * // ├── node_modules/
 * // │   ├── @macts/calendar/         (CLI plugin)
 * // │   └── @macts/calendar-server/  (MCP server plugin)
 * // └── .plugins-cache.json
 * ```
 */
export function getPluginsDir(): string {
  return join(getMactsHome(), 'plugins')
}

/**
 * Path to plugins package.json.
 *
 * This file tracks installed plugins as dependencies.
 */
export function getPluginsPackageJson(): string {
  return join(getPluginsDir(), 'package.json')
}

/**
 * Path to plugins lockfile.
 *
 * Used to detect when plugins have changed and cache needs refresh.
 */
export function getPluginsLockfile(): string {
  return join(getPluginsDir(), 'package-lock.json')
}

/**
 * Path to plugins cache file.
 *
 * Stores discovered plugin metadata and lockfile hash for fast startup.
 */
export function getPluginsCacheFile(): string {
  return join(getPluginsDir(), '.plugins-cache.json')
}

/**
 * Path to plugins node_modules.
 */
export function getPluginsNodeModules(): string {
  return join(getPluginsDir(), 'node_modules')
}

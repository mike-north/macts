/**
 * Shared path utilities for plugin management.
 *
 * These paths are used by both the plugin loader and cache system.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import { homedir } from 'node:os'

/**
 * Get the base macts directory.
 *
 * Defaults to ~/.macts but can be overridden via MACTS_HOME environment variable.
 *
 * @returns Path to macts home directory
 */
export function getMactsHome(): string {
  return process.env['MACTS_HOME'] ?? join(homedir(), '.macts')
}

/**
 * Get the plugins directory (shared with CLI).
 *
 * This is where plugins are installed and managed.
 *
 * @returns Path to plugins directory
 */
export function getPluginsDir(): string {
  return join(getMactsHome(), 'plugins')
}

/**
 * Get the plugins node_modules path.
 *
 * This is where plugin packages are installed.
 *
 * @returns Path to plugins node_modules
 */
export function getPluginsNodeModules(): string {
  return join(getPluginsDir(), 'node_modules')
}

/**
 * Get the lockfile path.
 *
 * Used by the cache system to detect plugin changes.
 *
 * @returns Path to package-lock.json
 */
export function getPluginsLockfile(): string {
  return join(getPluginsDir(), 'package-lock.json')
}

/**
 * Get the MCP plugin cache file path.
 *
 * Cache stores plugin metadata for fast startup.
 *
 * @returns Path to cache file
 */
export function getMcpPluginsCacheFile(): string {
  return join(getPluginsDir(), '.mcp-plugins-cache.json')
}

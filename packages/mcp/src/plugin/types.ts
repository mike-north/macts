/**
 * MCP plugin discovery types.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '../types.js'

/**
 * Result of discovering MCP plugins.
 */
export interface PluginDiscoveryResult {
  /** Successfully loaded plugins */
  readonly plugins: readonly McpPlugin[]

  /** Packages that failed to load, with error messages */
  readonly errors: readonly PluginLoadError[]
}

/**
 * Error that occurred while loading a plugin.
 */
export interface PluginLoadError {
  /** Package name that failed to load */
  readonly packageName: string

  /** Error message */
  readonly message: string
}

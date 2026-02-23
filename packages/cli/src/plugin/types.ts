import type { CommandClass } from 'clipanion'

/**
 * CLI plugin interface.
 *
 * A plugin provides commands for a specific application SDK.
 * Plugins are dynamically discovered from `@macts/cli-*` packages.
 */
export interface CliPlugin {
  /** Plugin name (e.g., 'calendar') */
  readonly name: string

  /** Human-readable description */
  readonly description: string

  /** Commands provided by this plugin */
  readonly commands: readonly CommandClass[]
}

/**
 * Result of discovering plugins.
 */
export interface PluginDiscoveryResult {
  /** Successfully loaded plugins */
  readonly plugins: readonly CliPlugin[]

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

/**
 * Result of registering plugins with the CLI.
 */
export interface PluginRegistrationResult {
  /** Number of plugins successfully registered */
  readonly registered: number

  /** Plugin names that were registered */
  readonly pluginNames: readonly string[]

  /** Errors from loading */
  readonly loadErrors: readonly PluginLoadError[]
}

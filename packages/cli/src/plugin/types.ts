import type { CommandClass } from 'clipanion'

/**
 * CLI plugin interface.
 *
 * A plugin provides commands for a specific application SDK.
 * Plugins are dynamically discovered from `@macts/<app>` packages.
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
 * Classification of why a plugin failed to load.
 *
 * Discriminates a genuinely-absent package (the user simply hasn't installed
 * that app's plugin — expected, and not worth reporting) from every other
 * failure (the package is present but broken in some way — always worth
 * surfacing to the user). Consumers should branch on this field rather than
 * pattern-matching {@link PluginLoadError.message}, since a real breakage can
 * legitimately contain the same substrings a "not installed" message would.
 */
export type PluginLoadFailureReason = 'not-installed' | 'load-error'

/**
 * Error that occurred while loading a plugin.
 */
export interface PluginLoadError {
  /** Package name that failed to load */
  readonly packageName: string

  /** Structural classification of the failure. */
  readonly reason: PluginLoadFailureReason

  /** Error message */
  readonly message: string
}

/**
 * Result of loading a single plugin by package name.
 */
export type LoadPluginResult =
  | { success: true; plugin: CliPlugin }
  | { success: false; reason: PluginLoadFailureReason; error: string }

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

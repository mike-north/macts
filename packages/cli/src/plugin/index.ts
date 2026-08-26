/**
 * CLI plugin system for extending macts functionality.
 *
 * Plugins are npm packages scoped under @macts/<app> that provide additional
 * CLI commands for specific macOS applications. They are managed via
 * `macts plugin install/uninstall/list` commands and installed into
 * ~/.macts/plugins/ directory. (An app's MCP server plugin ships separately as
 * `@macts/<app>-server` and is managed via `macts mcp install`.)
 *
 * ## Plugin Discovery
 *
 * Plugins are discovered automatically on CLI startup by scanning the
 * ~/.macts/plugins/node_modules directory for packages matching the pattern
 * `@macts/<app>` (excluding infrastructure and `-server` packages). Discovery
 * results are cached using the npm lockfile hash for fast startup.
 *
 * ## Plugin Structure
 *
 * A CLI plugin is an npm package that:
 * 1. Has a name matching `@macts/<app>`
 * 2. Includes `macts-cli-plugin` in package.json keywords
 * 3. Exports a `plugin` object conforming to the `CliPlugin` interface
 *
 * @example
 * ```typescript
 * // Creating a plugin (@macts/myapp/src/index.ts)
 * import type { CliPlugin } from '@macts/cli';
 * import { Command } from 'clipanion';
 *
 * class MyAppListCommand extends Command {
 *   static paths = [['myapp', 'list']];
 *   static usage = Command.Usage({ description: 'List items' });
 *
 *   async execute(): Promise<number> {
 *     this.context.stdout.write('Listing items...\n');
 *     return 0;
 *   }
 * }
 *
 * export const plugin: CliPlugin = {
 *   name: 'myapp',
 *   description: 'MyApp automation commands',
 *   commands: [MyAppListCommand],
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Using plugin discovery and registration
 * import { discoverPlugins, registerAllPlugins } from '@macts/cli';
 * import { Cli } from 'clipanion';
 *
 * const cli = new Cli();
 * const { plugins, errors } = await discoverPlugins();
 * const result = registerAllPlugins(cli, { plugins, errors });
 *
 * console.log(`Registered ${result.registered} plugins`);
 * for (const error of errors) {
 *   console.error(`Failed to load ${error.packageName}: ${error.message}`);
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * CLI plugin interface defining the structure of a plugin.
 *
 * Plugins provide commands that are automatically registered with the CLI.
 */
export type {
  CliPlugin,
  LoadPluginResult,
  PluginDiscoveryResult,
  PluginLoadError,
  PluginLoadFailureReason,
  PluginRegistrationResult,
} from './types.js'

/**
 * Cached plugin metadata for fast startup.
 */
export type { CachedPlugin } from './cache.js'

/**
 * Plugin manager types for installation and management.
 */
export type { InstalledPlugin, InstallResult, UninstallResult } from './manager.js'

/**
 * Discover and load all installed CLI plugins.
 *
 * Scans ~/.macts/plugins/node_modules for packages matching the @macts/<app>
 * pattern. Uses cached metadata when available for performance.
 */
export { discoverPlugins, loadPlugin } from './loader.js'

/**
 * Register plugins with a Clipanion CLI instance.
 *
 * Adds all commands from plugins to the CLI dispatcher.
 */
export { registerPlugin, registerAllPlugins } from './register.js'

/**
 * Plugin management functions for installation and removal.
 *
 * These functions are used by the `macts plugin` and `macts mcp install`
 * commands to manage plugins in the ~/.macts/plugins directory via npm. CLI
 * plugins (`@macts/<app>`) and MCP server plugins (`@macts/<app>-server`) share
 * the same managed directory; discovery distinguishes them by package suffix.
 */
export {
  installPlugin,
  uninstallPlugin,
  listInstalledPlugins,
  installMcpServerPlugin,
  uninstallMcpServerPlugin,
  listInstalledMcpServerPlugins,
  resolveMcpServerPackageName,
  initializePluginsDir,
} from './manager.js'

/**
 * Path utilities for locating macts configuration and plugin directories.
 */
export { getMactsHome, getPluginsDir } from './paths.js'

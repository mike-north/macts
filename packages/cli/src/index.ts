/**
 * @macts/cli - Command-line interface for macOS application automation
 *
 * This package provides:
 * - CLI commands for SDK generation, API key management, and plugin management
 * - MCP server integration for AI assistants
 * - HTTP API server for remote access
 * - Plugin system for extending functionality
 * - Output formatting utilities for consistent CLI output
 *
 * @example
 * ```typescript
 * // Using output formatters in a plugin
 * import { createFormatter } from '@macts/cli';
 *
 * const formatter = createFormatter(jsonMode);
 * const output = formatter.format({ id: '123', name: 'Example' });
 * ```
 *
 * @example
 * ```typescript
 * // Discovering and registering plugins
 * import { discoverPlugins, registerAllPlugins } from '@macts/cli';
 * import { Cli } from 'clipanion';
 *
 * const { plugins, errors } = await discoverPlugins();
 * const cli = new Cli();
 * registerAllPlugins(cli, { plugins, errors });
 * ```
 *
 * @packageDocumentation
 */

/**
 * Version string from @macts/core package.
 *
 * @example
 * ```typescript
 * import { VERSION } from '@macts/cli';
 * console.log(`macts v${VERSION}`);
 * ```
 */
export { VERSION } from '@macts/core'

// Commands
/**
 * Command to generate TypeScript SDK packages from manifests.
 *
 * @example
 * ```bash
 * macts generate manifests/calendar/app.yaml \
 *   --out-dir packages/sdk-calendar \
 *   --package-name @macts/sdk-calendar
 * ```
 */
export { GenerateCommand } from './commands/generate.js'

/**
 * Commands for discovering typed capabilities (`macts capabilities search` and
 * `macts capabilities inspect`).
 *
 * @example
 * ```bash
 * macts capabilities search "create a calendar event"
 * macts capabilities inspect calendar.events.create
 * ```
 */
export {
  CapabilitiesSearchCommand,
  CapabilitiesInspectCommand,
} from './commands/capabilities/index.js'

/**
 * Root command that handles global flags like --mcp and --serve.
 *
 * @example
 * ```bash
 * # Start MCP server
 * macts --mcp
 *
 * # Start HTTP server
 * macts --serve --port 3000
 * ```
 */
export { RootCommand } from './commands/root.js'

// Plugin system
/**
 * CLI plugin interface. Plugins provide commands for specific macOS applications.
 *
 * @example
 * ```typescript
 * import type { CliPlugin } from '@macts/cli';
 * import { Command } from 'clipanion';
 *
 * class MyCommand extends Command {
 *   static paths = [['myapp', 'list']];
 *   async execute() { return 0; }
 * }
 *
 * export const plugin: CliPlugin = {
 *   name: 'myapp',
 *   description: 'MyApp automation',
 *   commands: [MyCommand],
 * };
 * ```
 */
export type {
  CliPlugin,
  PluginDiscoveryResult,
  PluginLoadError,
  PluginRegistrationResult,
} from './plugin/index.js'

/**
 * Discover all installed CLI plugins from ~/.macts/plugins/.
 *
 * Uses npm's package-lock.json hash to cache plugin metadata for fast startup.
 * Plugins must be scoped under @macts/cli-* for security.
 *
 * @returns Discovery result with loaded plugins and any errors
 *
 * @example
 * ```typescript
 * const { plugins, errors } = await discoverPlugins();
 * console.log(`Found ${plugins.length} plugins`);
 * for (const error of errors) {
 *   console.error(`Failed to load ${error.packageName}: ${error.message}`);
 * }
 * ```
 */
export { discoverPlugins } from './plugin/index.js'

/**
 * Load a single plugin by package name.
 *
 * @param packageName - npm package name (e.g., '@macts/cli-calendar')
 * @returns Result with plugin or error
 *
 * @example
 * ```typescript
 * const result = await loadPlugin('@macts/cli-calendar');
 * if (result.success) {
 *   console.log(`Loaded plugin: ${result.plugin.name}`);
 * } else {
 *   console.error(`Failed to load: ${result.error}`);
 * }
 * ```
 */
export { loadPlugin } from './plugin/index.js'

/**
 * Register a single plugin with the CLI.
 *
 * @param cli - Clipanion CLI instance
 * @param plugin - Plugin to register
 *
 * @example
 * ```typescript
 * import { Cli } from 'clipanion';
 * import { registerPlugin } from '@macts/cli';
 *
 * const cli = new Cli();
 * registerPlugin(cli, myPlugin);
 * ```
 */
export { registerPlugin } from './plugin/index.js'

/**
 * Register all plugins from a discovery result.
 *
 * @param cli - Clipanion CLI instance
 * @param discoveryResult - Result from discoverPlugins()
 * @returns Registration result with counts and errors
 *
 * @example
 * ```typescript
 * import { Cli } from 'clipanion';
 * import { discoverPlugins, registerAllPlugins } from '@macts/cli';
 *
 * const { plugins, errors } = await discoverPlugins();
 * const cli = new Cli();
 * const result = registerAllPlugins(cli, { plugins, errors });
 * console.log(`Registered ${result.registered} plugins`);
 * ```
 */
export { registerAllPlugins } from './plugin/index.js'

// Output formatters
/**
 * Output formatter interface for converting data to CLI output.
 *
 * Formatters provide consistent output formatting for both human-readable
 * and JSON modes.
 */
export type { OutputFormatter, TableColumn, TableOptions } from './output/index.js'

/**
 * Create a formatter based on output mode (JSON or human-readable).
 *
 * @param json - Whether to use JSON output
 * @returns Appropriate formatter instance
 *
 * @example
 * ```typescript
 * const formatter = createFormatter(jsonMode);
 *
 * // Format single object
 * console.log(formatter.format({ id: '123', name: 'Alice' }));
 *
 * // Format list as table
 * console.log(formatter.formatList(
 *   [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
 *   { columns: [{ header: 'ID', key: 'id' }, { header: 'Name', key: 'name' }] }
 * ));
 *
 * // Format messages
 * console.log(formatter.formatSuccess('Done!'));
 * console.error(formatter.formatError('Failed'));
 * ```
 */
export { createFormatter } from './output/index.js'

/**
 * JSON formatter implementation.
 *
 * Outputs all data as formatted JSON. Success and error messages are wrapped
 * in objects with appropriate fields.
 *
 * @example
 * ```typescript
 * const formatter = new JsonFormatter();
 * console.log(formatter.format({ status: 'ok' }));
 * // Output: {"status":"ok"}
 * ```
 */
export { JsonFormatter } from './output/index.js'

/**
 * Human-readable formatter implementation.
 *
 * Outputs data as formatted tables for lists and plain text for objects.
 * Adds color coding for success/error messages.
 *
 * @example
 * ```typescript
 * const formatter = new HumanFormatter();
 * console.log(formatter.formatSuccess('Operation completed'));
 * // Output: "✓ Operation completed" (in green)
 * ```
 */
export { HumanFormatter } from './output/index.js'

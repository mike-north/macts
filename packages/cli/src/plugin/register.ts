import type { Cli } from 'clipanion'
import type { CliPlugin, PluginDiscoveryResult, PluginRegistrationResult } from './types.js'

/**
 * Register a single plugin with the CLI.
 *
 * @param cli - Clipanion CLI instance
 * @param plugin - Plugin to register
 */
export function registerPlugin(cli: Cli, plugin: CliPlugin): void {
  for (const Command of plugin.commands) {
    cli.register(Command)
  }
}

/**
 * Register all plugins from a discovery result.
 *
 * @param cli - Clipanion CLI instance
 * @param discoveryResult - Result from discoverPlugins()
 * @returns Registration result with counts and errors
 */
export function registerAllPlugins(
  cli: Cli,
  discoveryResult: PluginDiscoveryResult
): PluginRegistrationResult {
  const pluginNames: string[] = []

  for (const plugin of discoveryResult.plugins) {
    registerPlugin(cli, plugin)
    pluginNames.push(plugin.name)
  }

  return {
    registered: pluginNames.length,
    pluginNames,
    loadErrors: discoveryResult.errors,
  }
}

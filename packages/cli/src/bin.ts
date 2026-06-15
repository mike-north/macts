#!/usr/bin/env node
/**
 * CLI entry point
 */

import { Cli, Builtins } from 'clipanion'
import { GenerateCommand } from './commands/generate.js'
import { RootCommand } from './commands/root.js'
import {
  PluginInstallCommand,
  PluginUninstallCommand,
  PluginListCommand,
} from './commands/plugin/index.js'
import {
  McpServeCommand,
  McpStartCommand,
  McpStopCommand,
  McpStatusCommand,
  McpDiagnoseCommand,
} from './commands/mcp/index.js'
import {
  ApiKeyCreateCommand,
  ApiKeyListCommand,
  ApiKeyRevokeCommand,
  ApiKeyVerifyCommand,
} from './commands/api-key/index.js'
import { PermissionsListCommand, PermissionsExpandCommand } from './commands/permissions/index.js'
import {
  CapabilitiesSearchCommand,
  CapabilitiesInspectCommand,
} from './commands/capabilities/index.js'
import {
  ServiceInstallCommand,
  ServiceUninstallCommand,
  ServiceStatusCommand,
} from './commands/service/index.js'
import { discoverPlugins, registerAllPlugins } from './plugin/index.js'
import { VERSION } from '@macts/core'

const cli = new Cli({
  binaryLabel: 'macts',
  binaryName: 'macts',
  binaryVersion: VERSION,
})

// Register built-in commands
cli.register(RootCommand)
cli.register(GenerateCommand)
cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)

// Register plugin management commands
cli.register(PluginInstallCommand)
cli.register(PluginUninstallCommand)
cli.register(PluginListCommand)

// Register MCP daemon management commands
cli.register(McpServeCommand)
cli.register(McpStartCommand)
cli.register(McpStopCommand)
cli.register(McpStatusCommand)
cli.register(McpDiagnoseCommand)

// Register API key management commands
cli.register(ApiKeyCreateCommand)
cli.register(ApiKeyListCommand)
cli.register(ApiKeyRevokeCommand)
cli.register(ApiKeyVerifyCommand)

// Register permissions commands
cli.register(PermissionsListCommand)
cli.register(PermissionsExpandCommand)

// Register capability discovery commands
cli.register(CapabilitiesSearchCommand)
cli.register(CapabilitiesInspectCommand)

// Register service management commands
cli.register(ServiceInstallCommand)
cli.register(ServiceUninstallCommand)
cli.register(ServiceStatusCommand)

// Discover and register plugins
const pluginResults = await discoverPlugins()
const registration = registerAllPlugins(cli, pluginResults)

// Log plugin load errors (only in verbose mode or if there are errors with found packages)
for (const error of registration.loadErrors) {
  // Skip errors about packages not being installed (expected)
  if (error.message.includes('Cannot find package')) {
    continue
  }
  console.error(`Warning: Failed to load plugin ${error.packageName}: ${error.message}`)
}

await cli.runExit(process.argv.slice(2))

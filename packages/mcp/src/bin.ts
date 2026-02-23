#!/usr/bin/env node
/**
 * MCP server CLI entry point.
 *
 * Discovers plugins and starts the MCP server on stdio.
 *
 * @packageDocumentation
 */

import { createMcpServer } from './server.js'
import { discoverMcpPlugins } from './plugin/index.js'

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  // Discover all installed MCP plugins
  const { plugins, errors } = await discoverMcpPlugins()

  // Log errors to stderr (won't interfere with MCP stdio protocol)
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Warning: Failed to load plugin ${error.packageName}: ${error.message}`)
    }
  }

  // Start MCP server with discovered plugins
  await createMcpServer(plugins)
}

main().catch((error: unknown) => {
  console.error('Fatal error starting MCP server:', error)
  process.exit(1)
})

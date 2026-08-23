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
 * Determine whether API key validation should be skipped, from either the
 * `--disable-api-key-validation` CLI flag or the `MACTS_DISABLE_API_KEY_VALIDATION`
 * environment variable (set to `1` to disable).
 */
function isApiKeyValidationDisabled(): boolean {
  return (
    process.argv.includes('--disable-api-key-validation') ||
    process.env['MACTS_DISABLE_API_KEY_VALIDATION'] === '1'
  )
}

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
  await createMcpServer(plugins, {
    disableApiKeyValidation: isApiKeyValidationDisabled(),
  })
}

main().catch((error: unknown) => {
  // Print only the message (no stack trace) so remediation guidance from
  // requireStartupApiKey() reads cleanly in a terminal.
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})

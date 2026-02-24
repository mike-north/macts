/**
 * MCP plugin for macOS Safari.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { safariPlugin as plugin, safariPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

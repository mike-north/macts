/**
 * MCP plugin for macOS Terminal.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { terminalPlugin as plugin, terminalPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

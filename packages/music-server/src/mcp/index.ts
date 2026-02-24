/**
 * MCP plugin for macOS Music.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { musicPlugin as plugin, musicPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

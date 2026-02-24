/**
 * MCP plugin for macOS Alfred.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { alfredPlugin as plugin, alfredPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

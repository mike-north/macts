/**
 * MCP plugin for macOS Messages.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { messagesPlugin as plugin, messagesPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

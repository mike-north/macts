/**
 * MCP plugin for macOS Xcode.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { xcodePlugin as plugin, xcodePlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

/**
 * MCP plugin for macOS Reminders.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { remindersPlugin as plugin, remindersPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

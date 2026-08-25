/**
 * MCP plugin for macOS Mail.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { mailPlugin as plugin, mailPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/types'

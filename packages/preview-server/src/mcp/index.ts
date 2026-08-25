/**
 * MCP plugin for macOS Preview.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { previewPlugin as plugin, previewPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/types'

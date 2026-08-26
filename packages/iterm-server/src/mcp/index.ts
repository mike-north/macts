/**
 * MCP plugin for macOS iTerm.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { itermPlugin as plugin, itermPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/types'

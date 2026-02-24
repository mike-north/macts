/**
 * MCP plugin for macOS OmniPlan.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { omniplanPlugin as plugin, omniplanPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/mcp'

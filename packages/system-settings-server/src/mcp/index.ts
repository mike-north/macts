/**
 * MCP plugin for macOS System Settings.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { systemSettingsPlugin as plugin, systemSettingsPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/types'

/**
 * MCP plugin for macOS System Information.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { systemInformationPlugin as plugin, systemInformationPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

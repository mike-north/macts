/**
 * MCP plugin for macOS System Events.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { systemEventsPlugin as plugin, systemEventsPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

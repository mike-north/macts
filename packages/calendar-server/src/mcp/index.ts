/**
 * MCP plugin for macOS Calendar.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { calendarPlugin as plugin, calendarPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

/**
 * MCP plugin for macOS Finder.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { finderPlugin as plugin, finderPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

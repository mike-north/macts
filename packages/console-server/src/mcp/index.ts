/**
 * MCP plugin for macOS Console.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { consolePlugin as plugin, consolePlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

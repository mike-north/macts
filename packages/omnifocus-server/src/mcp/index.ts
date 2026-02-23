/**
 * MCP plugin for macOS OmniFocus.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { omnifocusPlugin as plugin, omnifocusPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

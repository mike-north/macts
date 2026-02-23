/**
 * MCP plugin for macOS Automator.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { automatorPlugin as plugin, automatorPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

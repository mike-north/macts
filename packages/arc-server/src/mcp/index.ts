/**
 * MCP plugin for macOS Arc.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { arcPlugin as plugin, arcPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

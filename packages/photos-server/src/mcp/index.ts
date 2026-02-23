/**
 * MCP plugin for macOS Photos.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { photosPlugin as plugin, photosPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

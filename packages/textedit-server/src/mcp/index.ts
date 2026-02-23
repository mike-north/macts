/**
 * MCP plugin for macOS TextEdit.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { texteditPlugin as plugin, texteditPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

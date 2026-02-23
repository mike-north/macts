/**
 * MCP plugin for macOS OmniGraffle.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { omnigrafflePlugin as plugin, omnigrafflePlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

/**
 * MCP plugin for macOS Spotify.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { spotifyPlugin as plugin, spotifyPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

/**
 * MCP plugin for macOS ScriptEditor.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { scriptEditorPlugin as plugin, scriptEditorPlugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';

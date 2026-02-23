/**
 * MCP plugin for ScriptEditor.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS ScriptEditor.app automation.
 *
 * Provides tools for managing script-editor resources.
 */
export const scriptEditorPlugin: McpPlugin = {
  name: 'script-editor',
  description: 'MCP plugin for macOS ScriptEditor.app automation',
  tools: allTools,
};

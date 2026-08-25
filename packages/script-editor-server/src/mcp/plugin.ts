/**
 * MCP plugin for Script Editor.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Script Editor.app automation.
 *
 * Provides tools for managing script-editor resources.
 */
export const scriptEditorPlugin: McpPlugin = {
  name: 'script-editor',
  description: 'MCP plugin for macOS Script Editor.app automation',
  tools: allTools,
}

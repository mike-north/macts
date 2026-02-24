/**
 * MCP plugin for Shortcuts.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Shortcuts.app automation.
 *
 * Provides tools for managing shortcuts resources.
 */
export const shortcutsPlugin: McpPlugin = {
  name: 'shortcuts',
  description: 'MCP plugin for macOS Shortcuts.app automation',
  tools: allTools,
}

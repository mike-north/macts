/**
 * MCP plugin for Microsoft Word.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Microsoft Word.app automation.
 *
 * Provides tools for managing microsoft-word resources.
 */
export const microsoftWordPlugin: McpPlugin = {
  name: 'microsoft-word',
  description: 'MCP plugin for macOS Microsoft Word.app automation',
  tools: allTools,
}

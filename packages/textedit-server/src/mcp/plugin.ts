/**
 * MCP plugin for TextEdit.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS TextEdit.app automation.
 *
 * Provides tools for managing textedit resources.
 */
export const texteditPlugin: McpPlugin = {
  name: 'textedit',
  description: 'MCP plugin for macOS TextEdit.app automation',
  tools: allTools,
}

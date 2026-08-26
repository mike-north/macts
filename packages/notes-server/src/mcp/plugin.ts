/**
 * MCP plugin for Notes.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Notes.app automation.
 *
 * Provides tools for managing notes resources.
 */
export const notesPlugin: McpPlugin = {
  name: 'notes',
  description: 'MCP plugin for macOS Notes.app automation',
  tools: allTools,
}

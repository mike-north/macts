/**
 * MCP plugin for Messages.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Messages.app automation.
 *
 * Provides tools for managing messages resources.
 */
export const messagesPlugin: McpPlugin = {
  name: 'messages',
  description: 'MCP plugin for macOS Messages.app automation',
  tools: allTools,
}

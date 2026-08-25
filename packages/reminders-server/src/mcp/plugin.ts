/**
 * MCP plugin for Reminders.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Reminders.app automation.
 *
 * Provides tools for managing reminders resources.
 */
export const remindersPlugin: McpPlugin = {
  name: 'reminders',
  description: 'MCP plugin for macOS Reminders.app automation',
  tools: allTools,
}

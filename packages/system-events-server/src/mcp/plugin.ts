/**
 * MCP plugin for System Events.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS System Events.app automation.
 *
 * Provides tools for managing system-events resources.
 */
export const systemEventsPlugin: McpPlugin = {
  name: 'system-events',
  description: 'MCP plugin for macOS System Events.app automation',
  tools: allTools,
}

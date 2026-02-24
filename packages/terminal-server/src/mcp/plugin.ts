/**
 * MCP plugin for Terminal.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Terminal.app automation.
 *
 * Provides tools for managing terminal resources.
 */
export const terminalPlugin: McpPlugin = {
  name: 'terminal',
  description: 'MCP plugin for macOS Terminal.app automation',
  tools: allTools,
}

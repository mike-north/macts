/**
 * MCP plugin for QuickTime Player.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS QuickTime Player.app automation.
 *
 * Provides tools for managing quicktime-player resources.
 */
export const quicktimePlayerPlugin: McpPlugin = {
  name: 'quicktime-player',
  description: 'MCP plugin for macOS QuickTime Player.app automation',
  tools: allTools,
}

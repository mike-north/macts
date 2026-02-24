/**
 * MCP plugin for Finder.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Finder.app automation.
 *
 * Provides tools for managing finder resources.
 */
export const finderPlugin: McpPlugin = {
  name: 'finder',
  description: 'MCP plugin for macOS Finder.app automation',
  tools: allTools,
}

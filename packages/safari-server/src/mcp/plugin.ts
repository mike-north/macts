/**
 * MCP plugin for Safari.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Safari.app automation.
 *
 * Provides tools for managing safari resources.
 */
export const safariPlugin: McpPlugin = {
  name: 'safari',
  description: 'MCP plugin for macOS Safari.app automation',
  tools: allTools,
}

/**
 * MCP plugin for iTerm.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS iTerm.app automation.
 *
 * Provides tools for managing iterm resources.
 */
export const itermPlugin: McpPlugin = {
  name: 'iterm',
  description: 'MCP plugin for macOS iTerm.app automation',
  tools: allTools,
}

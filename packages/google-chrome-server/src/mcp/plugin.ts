/**
 * MCP plugin for Google Chrome.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Google Chrome.app automation.
 *
 * Provides tools for managing google-chrome resources.
 */
export const googleChromePlugin: McpPlugin = {
  name: 'google-chrome',
  description: 'MCP plugin for macOS Google Chrome.app automation',
  tools: allTools,
}

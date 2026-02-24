/**
 * MCP plugin for Mail.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Mail.app automation.
 *
 * Provides tools for managing mail resources.
 */
export const mailPlugin: McpPlugin = {
  name: 'mail',
  description: 'MCP plugin for macOS Mail.app automation',
  tools: allTools,
}

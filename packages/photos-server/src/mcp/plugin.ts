/**
 * MCP plugin for Photos.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Photos.app automation.
 *
 * Provides tools for managing photos resources.
 */
export const photosPlugin: McpPlugin = {
  name: 'photos',
  description: 'MCP plugin for macOS Photos.app automation',
  tools: allTools,
}

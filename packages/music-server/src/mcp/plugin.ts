/**
 * MCP plugin for Music.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Music.app automation.
 *
 * Provides tools for managing music resources.
 */
export const musicPlugin: McpPlugin = {
  name: 'music',
  description: 'MCP plugin for macOS Music.app automation',
  tools: allTools,
}

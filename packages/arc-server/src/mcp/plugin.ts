/**
 * MCP plugin for Arc.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Arc.app automation.
 *
 * Provides tools for managing arc resources.
 */
export const arcPlugin: McpPlugin = {
  name: 'arc',
  description: 'MCP plugin for macOS Arc.app automation',
  tools: allTools,
}

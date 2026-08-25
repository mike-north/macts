/**
 * MCP plugin for Alfred.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Alfred.app automation.
 *
 * Provides tools for managing alfred resources.
 */
export const alfredPlugin: McpPlugin = {
  name: 'alfred',
  description: 'MCP plugin for macOS Alfred.app automation',
  tools: allTools,
}

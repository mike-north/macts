/**
 * MCP plugin for OmniFocus.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS OmniFocus.app automation.
 *
 * Provides tools for managing omnifocus resources.
 */
export const omnifocusPlugin: McpPlugin = {
  name: 'omnifocus',
  description: 'MCP plugin for macOS OmniFocus.app automation',
  tools: allTools,
}

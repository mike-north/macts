/**
 * MCP plugin for Xcode.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Xcode.app automation.
 *
 * Provides tools for managing xcode resources.
 */
export const xcodePlugin: McpPlugin = {
  name: 'xcode',
  description: 'MCP plugin for macOS Xcode.app automation',
  tools: allTools,
}

/**
 * MCP plugin for Bluetooth File Exchange.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/types'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Bluetooth File Exchange.app automation.
 *
 * Provides tools for managing bluetooth-file-exchange resources.
 */
export const bluetoothFileExchangePlugin: McpPlugin = {
  name: 'bluetooth-file-exchange',
  description: 'MCP plugin for macOS Bluetooth File Exchange.app automation',
  tools: allTools,
}

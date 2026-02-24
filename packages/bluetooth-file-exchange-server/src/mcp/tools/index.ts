/**
 * All MCP tools for bluetooth-file-exchange.
 *
 * @packageDocumentation
 */

import { appBrowseTool } from './app.js'
import { appSendTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [appBrowseTool, appSendTool] as const

/**
 * All MCP tools for system-settings.
 *
 * @packageDocumentation
 */

import { panesAuthorizeTool } from './panes.js'
import { panesTimedLoadTool } from './panes.js'
import { appRevealTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [panesAuthorizeTool, panesTimedLoadTool, appRevealTool] as const

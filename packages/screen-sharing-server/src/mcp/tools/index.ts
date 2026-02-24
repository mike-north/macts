/**
 * All MCP tools for screen-sharing.
 *
 * @packageDocumentation
 */

import { connectionsListTool } from './connections.js'
import { connectionsGetTool } from './connections.js'
import { appGetURLTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [connectionsListTool, connectionsGetTool, appGetURLTool] as const

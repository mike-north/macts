/**
 * All MCP tools for arc.
 *
 * @packageDocumentation
 */

import { appMakeTool } from './app.js'
import { appCountTool } from './app.js'
import { appCloseTool } from './app.js'
import { appSelectTool } from './app.js'
import { appGoBackTool } from './app.js'
import { appGoForwardTool } from './app.js'
import { appReloadTool } from './app.js'
import { appStopTool } from './app.js'
import { appExecuteTool } from './app.js'
import { appFocusTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  appMakeTool,
  appCountTool,
  appCloseTool,
  appSelectTool,
  appGoBackTool,
  appGoForwardTool,
  appReloadTool,
  appStopTool,
  appExecuteTool,
  appFocusTool,
] as const

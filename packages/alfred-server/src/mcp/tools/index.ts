/**
 * All MCP tools for alfred.
 *
 * @packageDocumentation
 */

import { appSearchTool } from './app.js'
import { appActionTool } from './app.js'
import { appBrowseTool } from './app.js'
import { appRunTriggerTool } from './app.js'
import { appReloadWorkflowTool } from './app.js'
import { appRevealWorkflowTool } from './app.js'
import { appSetConfigurationTool } from './app.js'
import { appRemoveConfigurationTool } from './app.js'
import { appSetThemeTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  appSearchTool,
  appActionTool,
  appBrowseTool,
  appRunTriggerTool,
  appReloadWorkflowTool,
  appRevealWorkflowTool,
  appSetConfigurationTool,
  appRemoveConfigurationTool,
  appSetThemeTool,
] as const

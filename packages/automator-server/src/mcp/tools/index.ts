/**
 * All MCP tools for automator.
 *
 * @packageDocumentation
 */

import { workflowsListTool } from './workflows.js'
import { workflowsGetTool } from './workflows.js'
import { workflowsExecuteTool } from './workflows.js'
import { automatoractionsListTool } from './automatoractions.js'
import { automatoractionsGetTool } from './automatoractions.js'
import { variablesListTool } from './variables.js'
import { variablesGetTool } from './variables.js'
import { settingsListTool } from './settings.js'
import { settingsGetTool } from './settings.js'
import { requiredresourcesListTool } from './requiredresources.js'
import { requiredresourcesGetTool } from './requiredresources.js'
import { appAddTool } from './app.js'
import { appRemoveTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  workflowsListTool,
  workflowsGetTool,
  workflowsExecuteTool,
  automatoractionsListTool,
  automatoractionsGetTool,
  variablesListTool,
  variablesGetTool,
  settingsListTool,
  settingsGetTool,
  requiredresourcesListTool,
  requiredresourcesGetTool,
  appAddTool,
  appRemoveTool,
] as const

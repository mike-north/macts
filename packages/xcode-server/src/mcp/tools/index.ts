/**
 * All MCP tools for xcode.
 *
 * @packageDocumentation
 */

import { workspacedocumentsListTool } from './workspacedocuments.js'
import { workspacedocumentsGetTool } from './workspacedocuments.js'
import { workspacedocumentsBuildTool } from './workspacedocuments.js'
import { workspacedocumentsCleanTool } from './workspacedocuments.js'
import { workspacedocumentsStopTool } from './workspacedocuments.js'
import { workspacedocumentsRunTool } from './workspacedocuments.js'
import { workspacedocumentsTestTool } from './workspacedocuments.js'
import { workspacedocumentsAttachTool } from './workspacedocuments.js'
import { workspacedocumentsDebugTool } from './workspacedocuments.js'
import { projectsListTool } from './projects.js'
import { projectsGetTool } from './projects.js'
import { schemesListTool } from './schemes.js'
import { schemesGetTool } from './schemes.js'
import { rundestinationsListTool } from './rundestinations.js'
import { rundestinationsGetTool } from './rundestinations.js'

/**
 * All MCP tools.
 */
export const allTools = [
  workspacedocumentsListTool,
  workspacedocumentsGetTool,
  workspacedocumentsBuildTool,
  workspacedocumentsCleanTool,
  workspacedocumentsStopTool,
  workspacedocumentsRunTool,
  workspacedocumentsTestTool,
  workspacedocumentsAttachTool,
  workspacedocumentsDebugTool,
  projectsListTool,
  projectsGetTool,
  schemesListTool,
  schemesGetTool,
  rundestinationsListTool,
  rundestinationsGetTool,
] as const

/**
 * All MCP tools for xcode.
 *
 * @packageDocumentation
 */

import { workspaceDocumentsListTool } from './workspaceDocuments.js'
import { workspaceDocumentsGetTool } from './workspaceDocuments.js'
import { workspaceDocumentsBuildTool } from './workspaceDocuments.js'
import { workspaceDocumentsCleanTool } from './workspaceDocuments.js'
import { workspaceDocumentsStopTool } from './workspaceDocuments.js'
import { workspaceDocumentsRunTool } from './workspaceDocuments.js'
import { workspaceDocumentsTestTool } from './workspaceDocuments.js'
import { workspaceDocumentsAttachTool } from './workspaceDocuments.js'
import { workspaceDocumentsDebugTool } from './workspaceDocuments.js'
import { projectsListTool } from './projects.js'
import { projectsGetTool } from './projects.js'
import { schemesListTool } from './schemes.js'
import { schemesGetTool } from './schemes.js'
import { runDestinationsListTool } from './runDestinations.js'
import { runDestinationsGetTool } from './runDestinations.js'

/**
 * All MCP tools.
 */
export const allTools = [
  workspaceDocumentsListTool,
  workspaceDocumentsGetTool,
  workspaceDocumentsBuildTool,
  workspaceDocumentsCleanTool,
  workspaceDocumentsStopTool,
  workspaceDocumentsRunTool,
  workspaceDocumentsTestTool,
  workspaceDocumentsAttachTool,
  workspaceDocumentsDebugTool,
  projectsListTool,
  projectsGetTool,
  schemesListTool,
  schemesGetTool,
  runDestinationsListTool,
  runDestinationsGetTool,
] as const

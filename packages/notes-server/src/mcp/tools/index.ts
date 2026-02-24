/**
 * All MCP tools for notes.
 *
 * @packageDocumentation
 */

import { accountsListTool } from './accounts.js'
import { accountsGetTool } from './accounts.js'
import { foldersListTool } from './folders.js'
import { foldersGetTool } from './folders.js'
import { notesListTool } from './notes.js'
import { notesGetTool } from './notes.js'
import { notesCreateTool } from './notes.js'
import { notesShowTool } from './notes.js'
import { attachmentsListTool } from './attachments.js'
import { attachmentsGetTool } from './attachments.js'

/**
 * All MCP tools.
 */
export const allTools = [
  accountsListTool,
  accountsGetTool,
  foldersListTool,
  foldersGetTool,
  notesListTool,
  notesGetTool,
  notesCreateTool,
  notesShowTool,
  attachmentsListTool,
  attachmentsGetTool,
] as const

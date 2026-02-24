/**
 * All MCP tools for shortcuts.
 *
 * @packageDocumentation
 */

import { shortcutsListTool } from './shortcuts.js'
import { shortcutsGetTool } from './shortcuts.js'
import { shortcutsRunTool } from './shortcuts.js'
import { foldersListTool } from './folders.js'
import { foldersGetTool } from './folders.js'

/**
 * All MCP tools.
 */
export const allTools = [
  shortcutsListTool,
  shortcutsGetTool,
  shortcutsRunTool,
  foldersListTool,
  foldersGetTool,
] as const

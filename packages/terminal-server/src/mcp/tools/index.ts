/**
 * All MCP tools for terminal.
 *
 * @packageDocumentation
 */

import { windowsListTool } from './windows.js'
import { windowsGetTool } from './windows.js'
import { tabsListTool } from './tabs.js'
import { tabsGetTool } from './tabs.js'
import { settingsSetsListTool } from './settingsSets.js'
import { settingsSetsGetTool } from './settingsSets.js'
import { appDoScriptTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  windowsListTool,
  windowsGetTool,
  tabsListTool,
  tabsGetTool,
  settingsSetsListTool,
  settingsSetsGetTool,
  appDoScriptTool,
] as const

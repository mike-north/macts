/**
 * All MCP tools for terminal.
 *
 * @packageDocumentation
 */

import { windowsListTool } from './windows.js'
import { windowsGetTool } from './windows.js'
import { tabsListTool } from './tabs.js'
import { tabsGetTool } from './tabs.js'
import { settingssetsListTool } from './settingssets.js'
import { settingssetsGetTool } from './settingssets.js'
import { appDoScriptTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  windowsListTool,
  windowsGetTool,
  tabsListTool,
  tabsGetTool,
  settingssetsListTool,
  settingssetsGetTool,
  appDoScriptTool,
] as const

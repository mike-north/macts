/**
 * All MCP tools for iterm.
 *
 * @packageDocumentation
 */

import { appCountTool } from './app.js'
import { appDeleteTool } from './app.js'
import { appDuplicateTool } from './app.js'
import { appExistsTool } from './app.js'
import { appMakeTool } from './app.js'
import { appMoveTool } from './app.js'
import { appCloseTool } from './app.js'
import { appRequestCookieTool } from './app.js'
import { appCreateTabTool } from './app.js'
import { appCreateTabWithDefaultProfileTool } from './app.js'
import { appCreateWindowWithProfileTool } from './app.js'
import { appCreateHotkeyWindowWithProfileTool } from './app.js'
import { appLaunchAPIScriptNamedTool } from './app.js'
import { appInvokeAPIExpressionTool } from './app.js'
import { appCreateWindowWithDefaultProfileTool } from './app.js'
import { appWriteTool } from './app.js'
import { appSelectTool } from './app.js'
import { appSplitVerticallyTool } from './app.js'
import { appSplitVerticallyWithDefaultProfileTool } from './app.js'
import { appSplitVerticallyWithSameProfileTool } from './app.js'
import { appSplitHorizontallyTool } from './app.js'
import { appSplitHorizontallyWithDefaultProfileTool } from './app.js'
import { appSplitHorizontallyWithSameProfileTool } from './app.js'
import { appVariableTool } from './app.js'
import { appSetVariableTool } from './app.js'
import { appRevealHotkeyWindowTool } from './app.js'
import { appHideHotkeyWindowTool } from './app.js'
import { appToggleHotkeyWindowTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  appCountTool,
  appDeleteTool,
  appDuplicateTool,
  appExistsTool,
  appMakeTool,
  appMoveTool,
  appCloseTool,
  appRequestCookieTool,
  appCreateTabTool,
  appCreateTabWithDefaultProfileTool,
  appCreateWindowWithProfileTool,
  appCreateHotkeyWindowWithProfileTool,
  appLaunchAPIScriptNamedTool,
  appInvokeAPIExpressionTool,
  appCreateWindowWithDefaultProfileTool,
  appWriteTool,
  appSelectTool,
  appSplitVerticallyTool,
  appSplitVerticallyWithDefaultProfileTool,
  appSplitVerticallyWithSameProfileTool,
  appSplitHorizontallyTool,
  appSplitHorizontallyWithDefaultProfileTool,
  appSplitHorizontallyWithSameProfileTool,
  appVariableTool,
  appSetVariableTool,
  appRevealHotkeyWindowTool,
  appHideHotkeyWindowTool,
  appToggleHotkeyWindowTool,
] as const

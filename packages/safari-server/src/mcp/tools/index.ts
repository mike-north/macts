/**
 * All MCP tools for safari.
 *
 * @packageDocumentation
 */

import { appAddReadingListItemTool } from './app.js'
import { appDoJavaScriptTool } from './app.js'
import { appEmailContentsTool } from './app.js'
import { appSearchTheWebTool } from './app.js'
import { appShowBookmarksTool } from './app.js'
import { appShowExtensionsPreferencesTool } from './app.js'
import { appDispatchMessageToExtensionTool } from './app.js'
import { appSyncAllPlistToDiskTool } from './app.js'
import { appShowPrivacyReportTool } from './app.js'
import { appShowCreditCardSettingsTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  appAddReadingListItemTool,
  appDoJavaScriptTool,
  appEmailContentsTool,
  appSearchTheWebTool,
  appShowBookmarksTool,
  appShowExtensionsPreferencesTool,
  appDispatchMessageToExtensionTool,
  appSyncAllPlistToDiskTool,
  appShowPrivacyReportTool,
  appShowCreditCardSettingsTool,
] as const

/**
 * All MCP tools for system-events.
 *
 * @packageDocumentation
 */

import { diskitemsDeleteTool } from './diskitems.js';
import { actionsPerformTool } from './actions.js';
import { uielementsClickTool } from './uielements.js';
import { uielementsSelectTool } from './uielements.js';
import { appAbortTransactionTool } from './app.js';
import { appBeginTransactionTool } from './app.js';
import { appEndTransactionTool } from './app.js';
import { appConnectTool } from './app.js';
import { appDisconnectTool } from './app.js';
import { appStartTool } from './app.js';
import { appStopTool } from './app.js';
import { appMoveTool } from './app.js';
import { appOpenTool } from './app.js';
import { appLogOutTool } from './app.js';
import { appRestartTool } from './app.js';
import { appShutDownTool } from './app.js';
import { appSleepTool } from './app.js';
import { appKeyCodeTool } from './app.js';
import { appKeystrokeTool } from './app.js';
import { appAttachActionToTool } from './app.js';
import { appAttachedScriptsTool } from './app.js';
import { appCancelTool } from './app.js';
import { appConfirmTool } from './app.js';
import { appDecrementTool } from './app.js';
import { appDoFolderActionTool } from './app.js';
import { appEditActionOfTool } from './app.js';
import { appIncrementTool } from './app.js';
import { appKeyDownTool } from './app.js';
import { appKeyUpTool } from './app.js';
import { appPickTool } from './app.js';
import { appRemoveActionFromTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  diskitemsDeleteTool,
  actionsPerformTool,
  uielementsClickTool,
  uielementsSelectTool,
  appAbortTransactionTool,
  appBeginTransactionTool,
  appEndTransactionTool,
  appConnectTool,
  appDisconnectTool,
  appStartTool,
  appStopTool,
  appMoveTool,
  appOpenTool,
  appLogOutTool,
  appRestartTool,
  appShutDownTool,
  appSleepTool,
  appKeyCodeTool,
  appKeystrokeTool,
  appAttachActionToTool,
  appAttachedScriptsTool,
  appCancelTool,
  appConfirmTool,
  appDecrementTool,
  appDoFolderActionTool,
  appEditActionOfTool,
  appIncrementTool,
  appKeyDownTool,
  appKeyUpTool,
  appPickTool,
  appRemoveActionFromTool,
] as const;

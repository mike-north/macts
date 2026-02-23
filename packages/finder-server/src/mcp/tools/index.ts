/**
 * All MCP tools for finder.
 *
 * @packageDocumentation
 */

import { appOpenTool } from './app.js';
import { appPrintTool } from './app.js';
import { appQuitTool } from './app.js';
import { appActivateTool } from './app.js';
import { appCloseTool } from './app.js';
import { appCountTool } from './app.js';
import { appDataSizeTool } from './app.js';
import { appDeleteTool } from './app.js';
import { appDuplicateTool } from './app.js';
import { appExistsTool } from './app.js';
import { appMakeTool } from './app.js';
import { appMoveTool } from './app.js';
import { appSelectTool } from './app.js';
import { appOpenVirtualLocationTool } from './app.js';
import { appCopyTool } from './app.js';
import { appSortTool } from './app.js';
import { appCleanUpTool } from './app.js';
import { appEjectTool } from './app.js';
import { appEmptyTool } from './app.js';
import { appEraseTool } from './app.js';
import { appRevealTool } from './app.js';
import { appUpdateTool } from './app.js';
import { appRestartTool } from './app.js';
import { appShutDownTool } from './app.js';
import { appSleepTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appOpenTool,
  appPrintTool,
  appQuitTool,
  appActivateTool,
  appCloseTool,
  appCountTool,
  appDataSizeTool,
  appDeleteTool,
  appDuplicateTool,
  appExistsTool,
  appMakeTool,
  appMoveTool,
  appSelectTool,
  appOpenVirtualLocationTool,
  appCopyTool,
  appSortTool,
  appCleanUpTool,
  appEjectTool,
  appEmptyTool,
  appEraseTool,
  appRevealTool,
  appUpdateTool,
  appRestartTool,
  appShutDownTool,
  appSleepTool,
] as const;

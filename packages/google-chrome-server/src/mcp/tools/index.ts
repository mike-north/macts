/**
 * All MCP tools for google-chrome.
 *
 * @packageDocumentation
 */

import { appSaveTool } from './app.js';
import { appOpenTool } from './app.js';
import { appCloseTool } from './app.js';
import { appQuitTool } from './app.js';
import { appCountTool } from './app.js';
import { appDeleteTool } from './app.js';
import { appDuplicateTool } from './app.js';
import { appExistsTool } from './app.js';
import { appMakeTool } from './app.js';
import { appMoveTool } from './app.js';
import { appPrintTool } from './app.js';
import { appReloadTool } from './app.js';
import { appGoBackTool } from './app.js';
import { appGoForwardTool } from './app.js';
import { appSelectAllTool } from './app.js';
import { appCutSelectionTool } from './app.js';
import { appCopySelectionTool } from './app.js';
import { appPasteSelectionTool } from './app.js';
import { appUndoTool } from './app.js';
import { appRedoTool } from './app.js';
import { appStopTool } from './app.js';
import { appViewSourceTool } from './app.js';
import { appExecuteTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appSaveTool,
  appOpenTool,
  appCloseTool,
  appQuitTool,
  appCountTool,
  appDeleteTool,
  appDuplicateTool,
  appExistsTool,
  appMakeTool,
  appMoveTool,
  appPrintTool,
  appReloadTool,
  appGoBackTool,
  appGoForwardTool,
  appSelectAllTool,
  appCutSelectionTool,
  appCopySelectionTool,
  appPasteSelectionTool,
  appUndoTool,
  appRedoTool,
  appStopTool,
  appViewSourceTool,
  appExecuteTool,
] as const;

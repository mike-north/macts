/**
 * All MCP tools for contacts.
 *
 * @packageDocumentation
 */

import { appMakeTool } from './app.js';
import { appAddTool } from './app.js';
import { appRemoveTool } from './app.js';
import { appSaveTool } from './app.js';
import { appActionPropertyTool } from './app.js';
import { appActionTitleTool } from './app.js';
import { appPerformActionTool } from './app.js';
import { appShouldEnableActionTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appMakeTool,
  appAddTool,
  appRemoveTool,
  appSaveTool,
  appActionPropertyTool,
  appActionTitleTool,
  appPerformActionTool,
  appShouldEnableActionTool,
] as const;

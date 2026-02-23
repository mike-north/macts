/**
 * All MCP tools for messages.
 *
 * @packageDocumentation
 */

import { appSendTool } from './app.js';
import { appLoginTool } from './app.js';
import { appLogoutTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appSendTool,
  appLoginTool,
  appLogoutTool,
] as const;

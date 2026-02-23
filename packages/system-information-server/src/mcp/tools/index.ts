/**
 * All MCP tools for system-information.
 *
 * @packageDocumentation
 */

import { documentsListTool } from './documents.js';
import { documentsGetTool } from './documents.js';
import { appSendTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  documentsListTool,
  documentsGetTool,
  appSendTool,
] as const;

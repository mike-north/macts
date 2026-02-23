/**
 * All MCP tools for textedit.
 *
 * @packageDocumentation
 */

import { documentsListTool } from './documents.js';
import { documentsGetTool } from './documents.js';
import { documentsCreateTool } from './documents.js';

/**
 * All MCP tools.
 */
export const allTools = [
  documentsListTool,
  documentsGetTool,
  documentsCreateTool,
] as const;

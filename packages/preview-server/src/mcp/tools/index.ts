/**
 * All MCP tools for preview.
 *
 * @packageDocumentation
 */

import { documentsListTool } from './documents.js';
import { documentsGetTool } from './documents.js';

/**
 * All MCP tools.
 */
export const allTools = [
  documentsListTool,
  documentsGetTool,
] as const;

/**
 * All MCP tools for microsoft-word.
 *
 * @packageDocumentation
 */

import { documentsListTool } from './documents.js';
import { documentsGetTool } from './documents.js';
import { documentsSaveTool } from './documents.js';
import { documentsSaveAsTool } from './documents.js';
import { documentsCloseTool } from './documents.js';
import { documentsPrintTool } from './documents.js';
import { documentsActivateTool } from './documents.js';
import { documentsCreateRangeTool } from './documents.js';
import { appUndoTool } from './app.js';
import { appRedoTool } from './app.js';
import { appCopyObjectTool } from './app.js';
import { appCutObjectTool } from './app.js';
import { appPasteObjectTool } from './app.js';
import { appSelectAllTool } from './app.js';
import { appFindTool } from './app.js';
import { appReplaceTool } from './app.js';
import { appInsertTextTool } from './app.js';
import { appCreateNewDocumentTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  documentsListTool,
  documentsGetTool,
  documentsSaveTool,
  documentsSaveAsTool,
  documentsCloseTool,
  documentsPrintTool,
  documentsActivateTool,
  documentsCreateRangeTool,
  appUndoTool,
  appRedoTool,
  appCopyObjectTool,
  appCutObjectTool,
  appPasteObjectTool,
  appSelectAllTool,
  appFindTool,
  appReplaceTool,
  appInsertTextTool,
  appCreateNewDocumentTool,
] as const;

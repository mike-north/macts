/**
 * All MCP tools for omnifocus.
 *
 * @packageDocumentation
 */

import { tasksListTool } from './tasks.js';
import { tasksGetTool } from './tasks.js';
import { tasksCreateTool } from './tasks.js';
import { projectsListTool } from './projects.js';
import { projectsGetTool } from './projects.js';
import { projectsCreateTool } from './projects.js';
import { foldersListTool } from './folders.js';
import { foldersGetTool } from './folders.js';
import { foldersCreateTool } from './folders.js';
import { tagsListTool } from './tags.js';
import { tagsGetTool } from './tags.js';
import { tagsCreateTool } from './tags.js';
import { inboxtasksListTool } from './inboxtasks.js';
import { inboxtasksGetTool } from './inboxtasks.js';
import { inboxtasksCreateTool } from './inboxtasks.js';
import { perspectivesListTool } from './perspectives.js';
import { perspectivesGetTool } from './perspectives.js';
import { appCompleteTool } from './app.js';
import { appMarkCompleteTool } from './app.js';
import { appMarkIncompleteTool } from './app.js';
import { appMarkDroppedTool } from './app.js';
import { appParseTasksIntoTool } from './app.js';
import { appArchiveTool } from './app.js';
import { appCompactTool } from './app.js';
import { appSynchronizeTool } from './app.js';
import { appImportIntoTool } from './app.js';
import { appUndoTool } from './app.js';
import { appRedoTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  tasksListTool,
  tasksGetTool,
  tasksCreateTool,
  projectsListTool,
  projectsGetTool,
  projectsCreateTool,
  foldersListTool,
  foldersGetTool,
  foldersCreateTool,
  tagsListTool,
  tagsGetTool,
  tagsCreateTool,
  inboxtasksListTool,
  inboxtasksGetTool,
  inboxtasksCreateTool,
  perspectivesListTool,
  perspectivesGetTool,
  appCompleteTool,
  appMarkCompleteTool,
  appMarkIncompleteTool,
  appMarkDroppedTool,
  appParseTasksIntoTool,
  appArchiveTool,
  appCompactTool,
  appSynchronizeTool,
  appImportIntoTool,
  appUndoTool,
  appRedoTool,
] as const;

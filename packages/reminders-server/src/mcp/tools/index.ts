/**
 * All MCP tools for reminders.
 *
 * @packageDocumentation
 */

import { accountsListTool } from './accounts.js';
import { listsListTool } from './lists.js';
import { listsGetTool } from './lists.js';
import { listsCreateTool } from './lists.js';
import { remindersListTool } from './reminders.js';
import { remindersGetTool } from './reminders.js';
import { remindersCreateTool } from './reminders.js';
import { remindersDeleteTool } from './reminders.js';
import { remindersCompleteTool } from './reminders.js';
import { remindersShowTool } from './reminders.js';

/**
 * All MCP tools.
 */
export const allTools = [
  accountsListTool,
  listsListTool,
  listsGetTool,
  listsCreateTool,
  remindersListTool,
  remindersGetTool,
  remindersCreateTool,
  remindersDeleteTool,
  remindersCompleteTool,
  remindersShowTool,
] as const;

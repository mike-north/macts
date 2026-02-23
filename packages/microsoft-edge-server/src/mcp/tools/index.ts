/**
 * All MCP tools for microsoft-edge.
 *
 * @packageDocumentation
 */

import { windowsListTool } from './windows.js';
import { windowsGetTool } from './windows.js';
import { windowsCreateTool } from './windows.js';
import { tabsListTool } from './tabs.js';
import { tabsGetTool } from './tabs.js';
import { tabsCreateTool } from './tabs.js';
import { tabsReloadTool } from './tabs.js';
import { tabsGoBackTool } from './tabs.js';
import { tabsGoForwardTool } from './tabs.js';
import { tabsSelectAllTool } from './tabs.js';
import { tabsCutSelectionTool } from './tabs.js';
import { tabsCopySelectionTool } from './tabs.js';
import { tabsPasteSelectionTool } from './tabs.js';
import { tabsUndoTool } from './tabs.js';
import { tabsRedoTool } from './tabs.js';
import { tabsStopTool } from './tabs.js';
import { tabsViewSourceTool } from './tabs.js';
import { tabsExecuteTool } from './tabs.js';
import { bookmarkfoldersListTool } from './bookmarkfolders.js';
import { bookmarkfoldersGetTool } from './bookmarkfolders.js';
import { bookmarkitemsListTool } from './bookmarkitems.js';
import { bookmarkitemsGetTool } from './bookmarkitems.js';

/**
 * All MCP tools.
 */
export const allTools = [
  windowsListTool,
  windowsGetTool,
  windowsCreateTool,
  tabsListTool,
  tabsGetTool,
  tabsCreateTool,
  tabsReloadTool,
  tabsGoBackTool,
  tabsGoForwardTool,
  tabsSelectAllTool,
  tabsCutSelectionTool,
  tabsCopySelectionTool,
  tabsPasteSelectionTool,
  tabsUndoTool,
  tabsRedoTool,
  tabsStopTool,
  tabsViewSourceTool,
  tabsExecuteTool,
  bookmarkfoldersListTool,
  bookmarkfoldersGetTool,
  bookmarkitemsListTool,
  bookmarkitemsGetTool,
] as const;

/**
 * All MCP tools for calendar.
 *
 * @packageDocumentation
 */

import { calendarsListTool } from './calendars.js';
import { calendarsGetTool } from './calendars.js';
import { calendarsCreateTool } from './calendars.js';
import { eventsListTool } from './events.js';
import { eventsGetTool } from './events.js';
import { eventsCreateTool } from './events.js';
import { eventsShowTool } from './events.js';
import { appReloadCalendarsTool } from './app.js';
import { appSwitchViewTool } from './app.js';
import { appViewCalendarTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  calendarsListTool,
  calendarsGetTool,
  calendarsCreateTool,
  eventsListTool,
  eventsGetTool,
  eventsCreateTool,
  eventsShowTool,
  appReloadCalendarsTool,
  appSwitchViewTool,
  appViewCalendarTool,
] as const;

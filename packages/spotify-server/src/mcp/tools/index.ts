/**
 * All MCP tools for spotify.
 *
 * @packageDocumentation
 */

import { appNextTrackTool } from './app.js';
import { appPreviousTrackTool } from './app.js';
import { appPlaypauseTool } from './app.js';
import { appPauseTool } from './app.js';
import { appPlayTool } from './app.js';
import { appPlayTrackTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appNextTrackTool,
  appPreviousTrackTool,
  appPlaypauseTool,
  appPauseTool,
  appPlayTool,
  appPlayTrackTool,
] as const;

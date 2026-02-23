/**
 * All MCP tools for music.
 *
 * @packageDocumentation
 */

import { filetracksRefreshTool } from './filetracks.js';
import { playlistsMoveTool } from './playlists.js';
import { playlistsSearchTool } from './playlists.js';
import { appPrintTool } from './app.js';
import { appCloseTool } from './app.js';
import { appCountTool } from './app.js';
import { appDeleteTool } from './app.js';
import { appDuplicateTool } from './app.js';
import { appExistsTool } from './app.js';
import { appMakeTool } from './app.js';
import { appOpenTool } from './app.js';
import { appRunTool } from './app.js';
import { appQuitTool } from './app.js';
import { appSaveTool } from './app.js';
import { appAddTool } from './app.js';
import { appBackTrackTool } from './app.js';
import { appConvertTool } from './app.js';
import { appDownloadTool } from './app.js';
import { appExportTool } from './app.js';
import { appFastForwardTool } from './app.js';
import { appNextTrackTool } from './app.js';
import { appPauseTool } from './app.js';
import { appPlayTool } from './app.js';
import { appPlaypauseTool } from './app.js';
import { appPreviousTrackTool } from './app.js';
import { appResumeTool } from './app.js';
import { appRevealTool } from './app.js';
import { appRewindTool } from './app.js';
import { appSelectTool } from './app.js';
import { appStopTool } from './app.js';
import { appOpenLocationTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  filetracksRefreshTool,
  playlistsMoveTool,
  playlistsSearchTool,
  appPrintTool,
  appCloseTool,
  appCountTool,
  appDeleteTool,
  appDuplicateTool,
  appExistsTool,
  appMakeTool,
  appOpenTool,
  appRunTool,
  appQuitTool,
  appSaveTool,
  appAddTool,
  appBackTrackTool,
  appConvertTool,
  appDownloadTool,
  appExportTool,
  appFastForwardTool,
  appNextTrackTool,
  appPauseTool,
  appPlayTool,
  appPlaypauseTool,
  appPreviousTrackTool,
  appResumeTool,
  appRevealTool,
  appRewindTool,
  appSelectTool,
  appStopTool,
  appOpenLocationTool,
] as const;

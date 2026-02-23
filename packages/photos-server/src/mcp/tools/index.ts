/**
 * All MCP tools for photos.
 *
 * @packageDocumentation
 */

import { mediaitemsListTool } from './mediaitems.js';
import { mediaitemsGetTool } from './mediaitems.js';
import { mediaitemsDuplicateTool } from './mediaitems.js';
import { albumsListTool } from './albums.js';
import { albumsGetTool } from './albums.js';
import { foldersListTool } from './folders.js';
import { foldersGetTool } from './folders.js';
import { appImportTool } from './app.js';
import { appExportTool } from './app.js';
import { appMakeTool } from './app.js';
import { appDeleteTool } from './app.js';
import { appAddTool } from './app.js';
import { appStartSlideshowTool } from './app.js';
import { appStopSlideshowTool } from './app.js';
import { appNextSlideTool } from './app.js';
import { appPreviousSlideTool } from './app.js';
import { appPauseSlideshowTool } from './app.js';
import { appResumeSlideshowTool } from './app.js';
import { appSpotlightTool } from './app.js';
import { appSearchTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  mediaitemsListTool,
  mediaitemsGetTool,
  mediaitemsDuplicateTool,
  albumsListTool,
  albumsGetTool,
  foldersListTool,
  foldersGetTool,
  appImportTool,
  appExportTool,
  appMakeTool,
  appDeleteTool,
  appAddTool,
  appStartSlideshowTool,
  appStopSlideshowTool,
  appNextSlideTool,
  appPreviousSlideTool,
  appPauseSlideshowTool,
  appResumeSlideshowTool,
  appSpotlightTool,
  appSearchTool,
] as const;

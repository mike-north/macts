/**
 * All MCP tools for quicktime-player.
 *
 * @packageDocumentation
 */

import { appOpenURLTool } from './app.js';
import { appPlayTool } from './app.js';
import { appStartTool } from './app.js';
import { appPauseTool } from './app.js';
import { appResumeTool } from './app.js';
import { appStopTool } from './app.js';
import { appStepBackwardTool } from './app.js';
import { appStepForwardTool } from './app.js';
import { appTrimTool } from './app.js';
import { appPresentTool } from './app.js';
import { appNewMovieRecordingTool } from './app.js';
import { appNewAudioRecordingTool } from './app.js';
import { appNewScreenRecordingTool } from './app.js';
import { appExportTool } from './app.js';
import { appShowRemoteHudTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  appOpenURLTool,
  appPlayTool,
  appStartTool,
  appPauseTool,
  appResumeTool,
  appStopTool,
  appStepBackwardTool,
  appStepForwardTool,
  appTrimTool,
  appPresentTool,
  appNewMovieRecordingTool,
  appNewAudioRecordingTool,
  appNewScreenRecordingTool,
  appExportTool,
  appShowRemoteHudTool,
] as const;

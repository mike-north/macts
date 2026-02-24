/**
 * MCP tools for Quicktime-player.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Open a URL.
 */
export const appOpenURLTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_open_u_r_l',
  description: 'Open a URL.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.openURL();
    return { success: true };
  },
};

/**
 * Play the movie.
 */
export const appPlayTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_play',
  description: 'Play the movie.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.play();
    return { success: true };
  },
};

/**
 * Start the movie recording.
 */
export const appStartTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_start',
  description: 'Start the movie recording.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.start();
    return { success: true };
  },
};

/**
 * Pause the recording.
 */
export const appPauseTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_pause',
  description: 'Pause the recording.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.pause();
    return { success: true };
  },
};

/**
 * Resume the recording.
 */
export const appResumeTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_resume',
  description: 'Resume the recording.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.resume();
    return { success: true };
  },
};

/**
 * Stop the movie or recording.
 */
export const appStopTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_stop',
  description: 'Stop the movie or recording.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.stop();
    return { success: true };
  },
};

/**
 * Step the movie backward the specified number of steps (default is 1).
 */
export const appStepBackwardTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_step_backward',
  description: 'Step the movie backward the specified number of steps (default is 1).',
  inputSchema: {
    "type": "object",
    "properties": {
      "by": {
        "description": "number of steps",
        "type": "number"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { by } = args as { by?: number };
    const client = getClient();
    await client.stepBackward(by as unknown);
    return { success: true };
  },
};

/**
 * Step the movie forward the specified number of steps (default is 1).
 */
export const appStepForwardTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_step_forward',
  description: 'Step the movie forward the specified number of steps (default is 1).',
  inputSchema: {
    "type": "object",
    "properties": {
      "by": {
        "description": "number of steps",
        "type": "number"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { by } = args as { by?: number };
    const client = getClient();
    await client.stepForward(by as unknown);
    return { success: true };
  },
};

/**
 * Trim the movie.
 */
export const appTrimTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_trim',
  description: 'Trim the movie.',
  inputSchema: {
    "type": "object",
    "properties": {
      "from": {
        "description": "start time in seconds",
        "type": "number"
      },
      "to": {
        "description": "end time in seconds",
        "type": "number"
      }
    },
    "additionalProperties": false,
    "required": [
      "from",
      "to"
    ]
  },
  handler: async (args) => {
    const { from, to } = args as { from: number; to: number };
    const client = getClient();
    await client.trim(from as unknown, to as unknown);
    return { success: true };
  },
};

/**
 * Present the document full screen.
 */
export const appPresentTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_present',
  description: 'Present the document full screen.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.present();
    return { success: true };
  },
};

/**
 * Create a new movie recording document.
 */
export const appNewMovieRecordingTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_new_movie_recording',
  description: 'Create a new movie recording document.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.newMovieRecording();
    return { success: true };
  },
};

/**
 * Create a new audio recording document.
 */
export const appNewAudioRecordingTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_new_audio_recording',
  description: 'Create a new audio recording document.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.newAudioRecording();
    return { success: true };
  },
};

/**
 * Create a new screen recording document.
 */
export const appNewScreenRecordingTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_new_screen_recording',
  description: 'Create a new screen recording document.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.newScreenRecording();
    return { success: true };
  },
};

/**
 * Export a movie to another file
 */
export const appExportTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_export',
  description: 'Export a movie to another file',
  inputSchema: {
    "type": "object",
    "properties": {
      "in": {
        "description": "the destination file",
        "type": "string"
      },
      "usingSettingsPreset": {
        "description": "the name of the export settings preset to use",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "in",
      "usingSettingsPreset"
    ]
  },
  handler: async (args) => {
    const { in: _in, usingSettingsPreset } = args as { in: string; usingSettingsPreset: string };
    const client = getClient();
    await client._export(_in as unknown, usingSettingsPreset as unknown);
    return { success: true };
  },
};

/**
 * Show the document's Remote HUD
 */
export const appShowRemoteHudTool: McpToolDefinition = {
  name: 'macts__quicktime-player__app_show_remote_hud',
  description: 'Show the document\'s Remote HUD',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.showRemoteHud();
    return { success: true };
  },
};


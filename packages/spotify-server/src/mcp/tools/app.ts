/**
 * MCP tools for Spotify.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Skip to the next track.
 */
export const appNextTrackTool: McpToolDefinition = {
  name: 'macts__spotify__app_next_track',
  description: 'Skip to the next track.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.nextTrack();
    return { success: true };
  },
};

/**
 * Skip to the previous track.
 */
export const appPreviousTrackTool: McpToolDefinition = {
  name: 'macts__spotify__app_previous_track',
  description: 'Skip to the previous track.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.previousTrack();
    return { success: true };
  },
};

/**
 * Toggle play/pause.
 */
export const appPlaypauseTool: McpToolDefinition = {
  name: 'macts__spotify__app_playpause',
  description: 'Toggle play/pause.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.playpause();
    return { success: true };
  },
};

/**
 * Pause playback.
 */
export const appPauseTool: McpToolDefinition = {
  name: 'macts__spotify__app_pause',
  description: 'Pause playback.',
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
 * Resume playback.
 */
export const appPlayTool: McpToolDefinition = {
  name: 'macts__spotify__app_play',
  description: 'Resume playback.',
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
 * Start playback of a track in the given context.
 */
export const appPlayTrackTool: McpToolDefinition = {
  name: 'macts__spotify__app_play_track',
  description: 'Start playback of a track in the given context.',
  inputSchema: {
    "type": "object",
    "properties": {
      "inContext": {
        "description": "the URI of the context to play in",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { inContext } = args as { inContext?: string };
    const client = getClient();
    await client.playTrack(inContext as unknown);
    return { success: true };
  },
};


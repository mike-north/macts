/**
 * MCP tools for Photos.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Import files into the library
 */
export const appImportTool: McpToolDefinition = {
  name: 'macts__photos__app_import',
  description: 'Import files into the library',
  inputSchema: {
    "type": "object",
    "properties": {
      "files": {
        "description": "The list of files to copy",
        "type": "array",
        "items": "string"
      },
      "into": {
        "description": "The album to import into",
        "type": "string"
      },
      "skipCheckDuplicates": {
        "description": "Skip duplicate checking and import everything",
        "type": "boolean"
      }
    },
    "additionalProperties": false,
    "required": [
      "files"
    ]
  },
  handler: async (args) => {
    const { files, into, skipCheckDuplicates } = args as { files: unknown[]; into?: string; skipCheckDuplicates?: boolean };
    const client = getClient();
    await client._import(files as unknown, into as unknown, skipCheckDuplicates as unknown);
    return { success: true };
  },
};

/**
 * Export media items to the specified location as files
 */
export const appExportTool: McpToolDefinition = {
  name: 'macts__photos__app_export',
  description: 'Export media items to the specified location as files',
  inputSchema: {
    "type": "object",
    "properties": {
      "mediaItems": {
        "description": "The list of media items to export",
        "type": "array",
        "items": "string"
      },
      "to": {
        "description": "The destination of the export",
        "type": "string"
      },
      "usingOriginals": {
        "description": "Export the original files if true, otherwise export rendered jpgs",
        "type": "boolean"
      }
    },
    "additionalProperties": false,
    "required": [
      "mediaItems",
      "to"
    ]
  },
  handler: async (args) => {
    const { mediaItems, to, usingOriginals } = args as { mediaItems: unknown[]; to: string; usingOriginals?: boolean };
    const client = getClient();
    await client._export(mediaItems as unknown, to as unknown, usingOriginals as unknown);
    return { success: true };
  },
};

/**
 * Create a new album or folder
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__photos__app_make',
  description: 'Create a new album or folder',
  inputSchema: {
    "type": "object",
    "properties": {
      "new": {
        "description": "The class of the new object (album or folder)",
        "type": "string"
      },
      "named": {
        "description": "The name of the new object",
        "type": "string"
      },
      "at": {
        "description": "The parent folder for the new object",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "new"
    ]
  },
  handler: async (args) => {
    const { new: _new, named, at } = args as { new: string; named?: string; at?: string };
    const client = getClient();
    await client.make(_new as unknown, named as unknown, at as unknown);
    return { success: true };
  },
};

/**
 * Delete an album or folder
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__photos__app_delete',
  description: 'Delete an album or folder',
  inputSchema: {
    "type": "object",
    "properties": {
      "target": {
        "description": "The album or folder to delete",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "target"
    ]
  },
  handler: async (args) => {
    const { target } = args as { target: string };
    const client = getClient();
    await client._delete(target as unknown);
    return { success: true };
  },
};

/**
 * Add media items to an album
 */
export const appAddTool: McpToolDefinition = {
  name: 'macts__photos__app_add',
  description: 'Add media items to an album',
  inputSchema: {
    "type": "object",
    "properties": {
      "mediaItems": {
        "description": "The list of media items to add",
        "type": "array",
        "items": "string"
      },
      "to": {
        "description": "The album to add to",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "mediaItems",
      "to"
    ]
  },
  handler: async (args) => {
    const { mediaItems, to } = args as { mediaItems: unknown[]; to: string };
    const client = getClient();
    await client.add(mediaItems as unknown, to as unknown);
    return { success: true };
  },
};

/**
 * Display an ad-hoc slide show from a list of media items
 */
export const appStartSlideshowTool: McpToolDefinition = {
  name: 'macts__photos__app_start_slideshow',
  description: 'Display an ad-hoc slide show from a list of media items',
  inputSchema: {
    "type": "object",
    "properties": {
      "using": {
        "description": "The media items to show",
        "type": "array",
        "items": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "using"
    ]
  },
  handler: async (args) => {
    const { using } = args as { using: unknown[] };
    const client = getClient();
    await client.startSlideshow(using as unknown);
    return { success: true };
  },
};

/**
 * End the currently-playing slideshow
 */
export const appStopSlideshowTool: McpToolDefinition = {
  name: 'macts__photos__app_stop_slideshow',
  description: 'End the currently-playing slideshow',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.stopSlideshow();
    return { success: true };
  },
};

/**
 * Skip to next slide in currently-playing slideshow
 */
export const appNextSlideTool: McpToolDefinition = {
  name: 'macts__photos__app_next_slide',
  description: 'Skip to next slide in currently-playing slideshow',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.nextSlide();
    return { success: true };
  },
};

/**
 * Skip to previous slide in currently-playing slideshow
 */
export const appPreviousSlideTool: McpToolDefinition = {
  name: 'macts__photos__app_previous_slide',
  description: 'Skip to previous slide in currently-playing slideshow',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.previousSlide();
    return { success: true };
  },
};

/**
 * Pause the currently-playing slideshow
 */
export const appPauseSlideshowTool: McpToolDefinition = {
  name: 'macts__photos__app_pause_slideshow',
  description: 'Pause the currently-playing slideshow',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.pauseSlideshow();
    return { success: true };
  },
};

/**
 * Resume the currently-playing slideshow
 */
export const appResumeSlideshowTool: McpToolDefinition = {
  name: 'macts__photos__app_resume_slideshow',
  description: 'Resume the currently-playing slideshow',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.resumeSlideshow();
    return { success: true };
  },
};

/**
 * Show the image at path in the application
 */
export const appSpotlightTool: McpToolDefinition = {
  name: 'macts__photos__app_spotlight',
  description: 'Show the image at path in the application',
  inputSchema: {
    "type": "object",
    "properties": {
      "target": {
        "description": "The full path to the image or media item ID",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "target"
    ]
  },
  handler: async (args) => {
    const { target } = args as { target: string };
    const client = getClient();
    await client.spotlight(target as unknown);
    return { success: true };
  },
};

/**
 * Search for items matching the search string
 */
export const appSearchTool: McpToolDefinition = {
  name: 'macts__photos__app_search',
  description: 'Search for items matching the search string',
  inputSchema: {
    "type": "object",
    "properties": {
      "for": {
        "description": "The text to search for",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "for"
    ]
  },
  handler: async (args) => {
    const { for: _for } = args as { for: string };
    const client = getClient();
    await client.search(_for as unknown);
    return { success: true };
  },
};


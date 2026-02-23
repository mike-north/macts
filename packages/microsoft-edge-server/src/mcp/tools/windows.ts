/**
 * MCP tools for Microsoft-edge.app windows operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all windows
 */
export const windowsListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__windows_list',
  description: 'List all windows',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.windows.list();
  },
};

/**
 * Get a window by ID
 */
export const windowsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__windows_get',
  description: 'Get a window by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Window identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "id"
    ]
  },
  handler: async (args) => {
    const { id } = args as { id: string };
    const client = getClient();
    return client.windows.get(id);
  },
};

/**
 * Create a new window
 */
export const windowsCreateTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__windows_create',
  description: 'Create a new window',
  inputSchema: {
    "type": "object",
    "properties": {
      "mode": {
        "description": "Window mode (normal or incognito)",
        "type": "string"
      },
      "givenName": {
        "description": "The given name of the window.",
        "type": "string"
      },
      "index": {
        "description": "The index of the window, ordered front to back.",
        "type": "number"
      },
      "bounds": {
        "description": "The bounding rectangle of the window.",
        "type": "object"
      },
      "minimized": {
        "description": "Whether the window is currently minimized.",
        "type": "boolean"
      },
      "visible": {
        "description": "Whether the window is currently visible.",
        "type": "boolean"
      },
      "zoomed": {
        "description": "Whether the window is currently zoomed.",
        "type": "boolean"
      },
      "activeTabIndex": {
        "description": "The index of the active tab.",
        "type": "number"
      }
    },
    "additionalProperties": false,
    "required": [
      "givenName",
      "index",
      "bounds",
      "minimized",
      "visible",
      "zoomed",
      "activeTabIndex"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.windows.create(args as Record<string, unknown>);
  },
};


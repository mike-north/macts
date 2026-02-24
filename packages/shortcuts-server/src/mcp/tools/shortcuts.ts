/**
 * MCP tools for Shortcuts.app shortcuts operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all shortcuts
 */
export const shortcutsListTool: McpToolDefinition = {
  name: 'macts__shortcuts__shortcuts_list',
  description: 'List all shortcuts',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.shortcuts.list();
  },
};

/**
 * Get a shortcut by ID
 */
export const shortcutsGetTool: McpToolDefinition = {
  name: 'macts__shortcuts__shortcuts_get',
  description: 'Get a shortcut by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Shortcut identifier",
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
    return client.shortcuts.get(id);
  },
};

/**
 * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
 */
export const shortcutsRunTool: McpToolDefinition = {
  name: 'macts__shortcuts__shortcuts_run',
  description: 'Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell \'Shortcuts Events\' instead of \'Shortcuts\'.',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "The shortcut to run",
        "type": "string"
      },
      "withInput": {
        "description": "The input to provide to the shortcut",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "id"
    ]
  },
  handler: async (args) => {
    const { id } = args as { id: string; withInput?: string };
    const client = getClient();
    await client.shortcuts.run(id);
    return { success: true };
  },
};


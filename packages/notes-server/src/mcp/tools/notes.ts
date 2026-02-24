/**
 * MCP tools for Notes.app notes operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List items
 */
export const notesListTool: McpToolDefinition = {
  name: 'macts__notes__notes_list',
  description: 'List items',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.notes.list();
  },
};

/**
 * Get an item by name
 */
export const notesGetTool: McpToolDefinition = {
  name: 'macts__notes__notes_get',
  description: 'Get an item by name',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Item name",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "name"
    ]
  },
  handler: async (args) => {
    const { name } = args as { name: string };
    const client = getClient();
    return client.notes.get(name);
  },
};

/**
 * Create a new note
 */
export const notesCreateTool: McpToolDefinition = {
  name: 'macts__notes__notes_create',
  description: 'Create a new note',
  inputSchema: {
    "type": "object",
    "properties": {
      "body": {
        "description": "HTML content of the note",
        "type": "string"
      },
      "name": {
        "description": "The name of the note (first line)",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const client = getClient();
    return client.notes.create(args as Record<string, unknown>);
  },
};

/**
 * Show a note in the Notes app
 */
export const notesShowTool: McpToolDefinition = {
  name: 'macts__notes__notes_show',
  description: 'Show a note in the Notes app',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Note name",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "name"
    ]
  },
  handler: async (args) => {
    const { name } = args as { name: string };
    const client = getClient();
    await client.notes.show(name);
    return { success: true };
  },
};


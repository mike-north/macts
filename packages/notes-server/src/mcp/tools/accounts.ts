/**
 * MCP tools for Notes.app accounts operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List items
 */
export const accountsListTool: McpToolDefinition = {
  name: 'macts__notes__accounts_list',
  description: 'List items',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.accounts.list();
  },
};

/**
 * Get an item by name
 */
export const accountsGetTool: McpToolDefinition = {
  name: 'macts__notes__accounts_get',
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
    return client.accounts.get(name);
  },
};


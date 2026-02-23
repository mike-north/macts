/**
 * MCP tools for Omnifocus.app tags operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all tags
 */
export const tagsListTool: McpToolDefinition = {
  name: 'macts__omnifocus__tags_list',
  description: 'List all tags',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.tags.list();
  },
};

/**
 * Get a tag by ID
 */
export const tagsGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__tags_get',
  description: 'Get a tag by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Tag identifier",
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
    return client.tags.get(id);
  },
};

/**
 * Create a new tag
 */
export const tagsCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__tags_create',
  description: 'Create a new tag',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Tag name",
        "type": "string"
      },
      "note": {
        "description": "The note of the tag",
        "type": "string"
      },
      "allowsNextAction": {
        "description": "If false, tasks associated with this tag will be skipped when determining the next action for a project",
        "type": "boolean"
      },
      "hidden": {
        "description": "Set if the tag is currently hidden",
        "type": "boolean"
      }
    },
    "additionalProperties": false,
    "required": [
      "name",
      "note",
      "allowsNextAction",
      "hidden"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.tags.create(args as Record<string, unknown>);
  },
};


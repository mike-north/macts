/**
 * MCP tools for Omniplan.app projects operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all projects
 */
export const projectsListTool: McpToolDefinition = {
  name: 'macts__omniplan__projects_list',
  description: 'List all projects',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.projects.list();
  },
};

/**
 * Get a project
 */
export const projectsGetTool: McpToolDefinition = {
  name: 'macts__omniplan__projects_get',
  description: 'Get a project',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Project identifier",
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
    return client.projects.get(id);
  },
};


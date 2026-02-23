/**
 * MCP tools for Omniplan.app scenarios operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all scenarios
 */
export const scenariosListTool: McpToolDefinition = {
  name: 'macts__omniplan__scenarios_list',
  description: 'List all scenarios',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.scenarios.list();
  },
};

/**
 * Get a scenario by ID
 */
export const scenariosGetTool: McpToolDefinition = {
  name: 'macts__omniplan__scenarios_get',
  description: 'Get a scenario by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Scenario identifier",
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
    return client.scenarios.get(id);
  },
};


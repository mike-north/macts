/**
 * MCP tools for Omniplan.app assignments operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all assignments
 */
export const assignmentsListTool: McpToolDefinition = {
  name: 'macts__omniplan__assignments_list',
  description: 'List all assignments',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.assignments.list();
  },
};


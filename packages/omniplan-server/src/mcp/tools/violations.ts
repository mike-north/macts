/**
 * MCP tools for Omniplan.app violations operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all violations
 */
export const violationsListTool: McpToolDefinition = {
  name: 'macts__omniplan__violations_list',
  description: 'List all violations',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.violations.list();
  },
};

/**
 * Fix a violation
 */
export const violationsFixTool: McpToolDefinition = {
  name: 'macts__omniplan__violations_fix',
  description: 'Fix a violation',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.violations.fix();
    return { success: true };
  },
};


/**
 * MCP tools for Reminders.app accounts operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all accounts
 */
export const accountsListTool: McpToolDefinition = {
  name: 'macts__reminders__accounts_list',
  description: 'List all accounts',
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


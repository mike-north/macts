/**
 * MCP tools for System-events.app actions operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * cause the target process to behave as if the action were applied to its UI element
 */
export const actionsPerformTool: McpToolDefinition = {
  name: 'macts__system-events__actions_perform',
  description: 'cause the target process to behave as if the action were applied to its UI element',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.actions.perform();
    return { success: true };
  },
};


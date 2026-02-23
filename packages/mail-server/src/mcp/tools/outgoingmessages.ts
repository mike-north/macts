/**
 * MCP tools for Mail.app outgoingmessages operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Sends a message.
 */
export const outgoingmessagesSendTool: McpToolDefinition = {
  name: 'macts__mail__outgoingmessages_send',
  description: 'Sends a message.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.outgoingmessages.send();
    return { success: true };
  },
};


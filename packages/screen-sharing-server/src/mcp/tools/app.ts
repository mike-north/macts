/**
 * MCP tools for Screen-sharing.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Open a vnc URL
 */
export const appGetURLTool: McpToolDefinition = {
  name: 'macts__screen-sharing__app_get_u_r_l',
  description: 'Open a vnc URL',
  inputSchema: {
    "type": "object",
    "properties": {
      "url": {
        "description": "The VNC URL to open",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "url"
    ]
  },
  handler: async (args) => {
    const { url } = args as { url: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.getURL(url as any);
    return { success: true };
  },
};


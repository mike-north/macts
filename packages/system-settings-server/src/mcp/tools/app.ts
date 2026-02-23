/**
 * MCP tools for System-settings.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Reveals a settings pane or an anchor within a pane.
 */
export const appRevealTool: McpToolDefinition = {
  name: 'macts__system-settings__app_reveal',
  description: 'Reveals a settings pane or an anchor within a pane.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.reveal();
    return { success: true };
  },
};


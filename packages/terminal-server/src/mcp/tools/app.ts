/**
 * MCP tools for Terminal.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Execute a shell command in a Terminal window or tab
 */
export const appDoScriptTool: McpToolDefinition = {
  name: 'macts__terminal__app_do_script',
  description: 'Execute a shell command in a Terminal window or tab',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "The command to execute",
        "type": "string"
      },
      "in": {
        "description": "The window or tab to run the command in",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "command"
    ]
  },
  handler: async (args) => {
    const { command, in: _in } = args as { command: string; in?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.doScript(command as any, _in as any);
    return { success: true };
  },
};


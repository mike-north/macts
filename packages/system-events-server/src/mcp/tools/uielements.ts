/**
 * MCP tools for System-events.app uielements operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * cause the target process to behave as if the UI element were clicked
 */
export const uielementsClickTool: McpToolDefinition = {
  name: 'macts__system-events__uielements_click',
  description: 'cause the target process to behave as if the UI element were clicked',
  inputSchema: {
    "type": "object",
    "properties": {
      "at": {
        "description": "when sent to a \"process\" object, the { x, y } location at which to click, in global coordinates",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { at } = args as { at?: string };
    const client = getClient();
    await client.uielements.click(at);
    return { success: true };
  },
};

/**
 * set the selected property of the UI element
 */
export const uielementsSelectTool: McpToolDefinition = {
  name: 'macts__system-events__uielements_select',
  description: 'set the selected property of the UI element',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.uielements.select();
    return { success: true };
  },
};


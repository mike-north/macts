/**
 * MCP tools for Automator.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Add an Automator action or variable to a workflow
 */
export const appAddTool: McpToolDefinition = {
  name: 'macts__automator__app_add',
  description: 'Add an Automator action or variable to a workflow',
  inputSchema: {
    "type": "object",
    "properties": {
      "object": {
        "description": "The Automator action or variable to add",
        "type": "string"
      },
      "to": {
        "description": "The workflow to which the action or variable is to be added",
        "type": "string"
      },
      "atIndex": {
        "description": "The index at which the action or variable is to be added",
        "type": "number"
      }
    },
    "additionalProperties": false,
    "required": [
      "object",
      "to"
    ]
  },
  handler: async (args) => {
    const { object, to, atIndex } = args as { object: string; to: string; atIndex?: number };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.add(object as any, to as any, atIndex as any);
    return { success: true };
  },
};

/**
 * Remove an Automator action or variable from a workflow
 */
export const appRemoveTool: McpToolDefinition = {
  name: 'macts__automator__app_remove',
  description: 'Remove an Automator action or variable from a workflow',
  inputSchema: {
    "type": "object",
    "properties": {
      "object": {
        "description": "The Automator action or variable to remove",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "object"
    ]
  },
  handler: async (args) => {
    const { object } = args as { object: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.remove(object as any);
    return { success: true };
  },
};


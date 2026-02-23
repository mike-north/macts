/**
 * MCP tools for Bluetooth-file-exchange.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Browse a device
 */
export const appBrowseTool: McpToolDefinition = {
  name: 'macts__bluetooth-file-exchange__app_browse',
  description: 'Browse a device',
  inputSchema: {
    "type": "object",
    "properties": {
      "device": {
        "description": "The device to browse",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { device } = args as { device?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.browse(device as any);
    return { success: true };
  },
};

/**
 * Send a file to a bluetooth device
 */
export const appSendTool: McpToolDefinition = {
  name: 'macts__bluetooth-file-exchange__app_send',
  description: 'Send a file to a bluetooth device',
  inputSchema: {
    "type": "object",
    "properties": {
      "file": {
        "description": "The file(s) to send",
        "type": "array",
        "items": "string"
      },
      "toDevice": {
        "description": "The device to send the file to",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { file, toDevice } = args as { file?: unknown[]; toDevice?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.send(file as any, toDevice as any);
    return { success: true };
  },
};


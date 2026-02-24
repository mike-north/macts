/**
 * MCP tools for Mail.app messages operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Does nothing at all (deprecated)
 */
export const messagesBounceTool: McpToolDefinition = {
  name: 'macts__mail__messages_bounce',
  description: 'Does nothing at all (deprecated)',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.messages.bounce();
    return { success: true };
  },
};

/**
 * Creates a forwarded message.
 */
export const messagesForwardTool: McpToolDefinition = {
  name: 'macts__mail__messages_forward',
  description: 'Creates a forwarded message.',
  inputSchema: {
    "type": "object",
    "properties": {
      "openingWindow": {
        "description": "Whether the window for the forwarded message is shown. Default is to not show the window.",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { openingWindow } = args as { openingWindow?: boolean };
    const client = getClient();
    await client.messages.forward(openingWindow);
    return { success: true };
  },
};

/**
 * Creates a redirected message.
 */
export const messagesRedirectTool: McpToolDefinition = {
  name: 'macts__mail__messages_redirect',
  description: 'Creates a redirected message.',
  inputSchema: {
    "type": "object",
    "properties": {
      "openingWindow": {
        "description": "Whether the window for the redirected message is shown. Default is to not show the window.",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { openingWindow } = args as { openingWindow?: boolean };
    const client = getClient();
    await client.messages.redirect(openingWindow);
    return { success: true };
  },
};

/**
 * Creates a reply message.
 */
export const messagesReplyTool: McpToolDefinition = {
  name: 'macts__mail__messages_reply',
  description: 'Creates a reply message.',
  inputSchema: {
    "type": "object",
    "properties": {
      "openingWindow": {
        "description": "Whether the window for the reply message is shown. Default is to not show the window.",
        "type": "boolean"
      },
      "replyToAll": {
        "description": "Whether to reply to all recipients. Default is to reply to the sender only.",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { openingWindow } = args as { openingWindow?: boolean; replyToAll?: boolean };
    const client = getClient();
    await client.messages.reply(openingWindow);
    return { success: true };
  },
};


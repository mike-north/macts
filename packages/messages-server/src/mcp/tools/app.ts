/**
 * MCP tools for Messages.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Sends a message to a participant or to a chat.
 */
export const appSendTool: McpToolDefinition = {
  name: 'macts__messages__app_send',
  description: 'Sends a message to a participant or to a chat.',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'The to parameter',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client.send(to as unknown as Parameters<typeof client.send>[0])
    return { success: true }
  },
}

/**
 * Login to all accounts.
 */
export const appLoginTool: McpToolDefinition = {
  name: 'macts__messages__app_login',
  description: 'Login to all accounts.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.login()
    return { success: true }
  },
}

/**
 * Logout of all accounts.
 */
export const appLogoutTool: McpToolDefinition = {
  name: 'macts__messages__app_logout',
  description: 'Logout of all accounts.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.logout()
    return { success: true }
  },
}

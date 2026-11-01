/**
 * MCP tools for Mail.app outgoingMessages operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Sends a message.
 */
export const outgoingMessagesSendTool: McpToolDefinition = {
  name: 'macts__mail__outgoingMessages_send',
  description: 'Sends a message.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.outgoingMessages.send()
    return { success: true }
  },
}

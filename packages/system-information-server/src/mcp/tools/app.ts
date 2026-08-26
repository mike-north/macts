/**
 * MCP tools for System-information.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Send system information to AppleCare
 */
export const appSendTool: McpToolDefinition = {
  name: 'macts__system-information__app_send',
  description: 'Send system information to AppleCare',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.send()
    return { success: true }
  },
}

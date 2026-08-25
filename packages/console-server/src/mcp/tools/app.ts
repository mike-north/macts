/**
 * MCP tools for Console.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Select a device.
 */
export const appSelectDeviceTool: McpToolDefinition = {
  name: 'macts__console__app_select_device',
  description: 'Select a device.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.selectDevice()
    return { success: true }
  },
}

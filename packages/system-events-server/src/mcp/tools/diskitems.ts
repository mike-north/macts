/**
 * MCP tools for System-events.app diskitems operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Delete disk item(s).
 */
export const diskitemsDeleteTool: McpToolDefinition = {
  name: 'macts__system-events__diskitems_delete',
  description: 'Delete disk item(s).',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'the unique ID of the disk item',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    await client.diskitems.delete(id as unknown as Parameters<typeof client.diskitems.delete>[0])
    return { success: true, message: `Deleted DiskItem ${id}` }
  },
}

/**
 * MCP tools for Notes.app attachments operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const attachmentsListTool: McpToolDefinition = {
  name: 'macts__notes__attachments_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.attachments.list()
  },
}

/**
 * Get an item by name
 */
export const attachmentsGetTool: McpToolDefinition = {
  name: 'macts__notes__attachments_get',
  description: 'Get an item by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Item name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.attachments.get(name as unknown as Parameters<typeof client.attachments.get>[0])
  },
}

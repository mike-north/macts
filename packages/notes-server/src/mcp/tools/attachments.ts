/**
 * MCP tools for Notes.app attachments operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
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
 * Get an attachment by ID
 */
export const attachmentsGetTool: McpToolDefinition = {
  name: 'macts__notes__attachments_get',
  description: 'Get an attachment by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Attachment identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.attachments.get(id as unknown as Parameters<typeof client.attachments.get>[0])
  },
}

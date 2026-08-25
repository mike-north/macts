/**
 * MCP tools for Microsoft-edge.app bookmarkitems operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all bookmark items in a folder
 */
export const bookmarkitemsListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkitems_list',
  description: 'List all bookmark items in a folder',
  inputSchema: {
    type: 'object',
    properties: {
      folderId: {
        description: 'Bookmark folder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['folderId'],
  },
  handler: async (args) => {
    const { folderId } = args as { folderId: string }

    const client = getClient()
    return client.bookmarkitems.list(folderId)
  },
}

/**
 * Get a bookmark item by ID
 */
export const bookmarkitemsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkitems_get',
  description: 'Get a bookmark item by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Bookmark item identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.bookmarkitems.get(id as unknown as Parameters<typeof client.bookmarkitems.get>[0])
  },
}

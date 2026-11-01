/**
 * MCP tools for Microsoft-edge.app bookmarkItems operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all bookmark items in a folder
 */
export const bookmarkItemsListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkItems_list',
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
    return client.bookmarkItems.list(folderId)
  },
}

/**
 * Get a bookmark item by ID
 */
export const bookmarkItemsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkItems_get',
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
    return client.bookmarkItems.get(id as unknown as Parameters<typeof client.bookmarkItems.get>[0])
  },
}

/**
 * MCP tools for Microsoft-edge.app bookmarkFolders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all bookmark folders
 */
export const bookmarkFoldersListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkFolders_list',
  description: 'List all bookmark folders',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.bookmarkFolders.list()
  },
}

/**
 * Get a bookmark folder by ID
 */
export const bookmarkFoldersGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkFolders_get',
  description: 'Get a bookmark folder by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Bookmark folder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.bookmarkFolders.get(
      id as unknown as Parameters<typeof client.bookmarkFolders.get>[0]
    )
  },
}

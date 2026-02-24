/**
 * MCP tools for Microsoft-edge.app bookmarkfolders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all bookmark folders
 */
export const bookmarkfoldersListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkfolders_list',
  description: 'List all bookmark folders',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.bookmarkfolders.list()
  },
}

/**
 * Get a bookmark folder by ID
 */
export const bookmarkfoldersGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__bookmarkfolders_get',
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
    return client.bookmarkfolders.get(id)
  },
}

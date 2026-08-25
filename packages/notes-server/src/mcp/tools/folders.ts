/**
 * MCP tools for Notes.app folders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const foldersListTool: McpToolDefinition = {
  name: 'macts__notes__folders_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.folders.list()
  },
}

/**
 * Get an item by name
 */
export const foldersGetTool: McpToolDefinition = {
  name: 'macts__notes__folders_get',
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
    return client.folders.get(name as unknown as Parameters<typeof client.folders.get>[0])
  },
}

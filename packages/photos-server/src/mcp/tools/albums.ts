/**
 * MCP tools for Photos.app albums operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all albums
 */
export const albumsListTool: McpToolDefinition = {
  name: 'macts__photos__albums_list',
  description: 'List all albums',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.albums.list()
  },
}

/**
 * Get an album by ID
 */
export const albumsGetTool: McpToolDefinition = {
  name: 'macts__photos__albums_get',
  description: 'Get an album by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Album identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.albums.get(id as unknown as Parameters<typeof client.albums.get>[0])
  },
}

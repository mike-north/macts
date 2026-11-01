/**
 * MCP tools for Photos.app mediaItems operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all media items
 */
export const mediaItemsListTool: McpToolDefinition = {
  name: 'macts__photos__mediaItems_list',
  description: 'List all media items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.mediaItems.list()
  },
}

/**
 * Get a media item by ID
 */
export const mediaItemsGetTool: McpToolDefinition = {
  name: 'macts__photos__mediaItems_get',
  description: 'Get a media item by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Media item identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.mediaItems.get(id as unknown as Parameters<typeof client.mediaItems.get>[0])
  },
}

/**
 * Duplicate a media item
 */
export const mediaItemsDuplicateTool: McpToolDefinition = {
  name: 'macts__photos__mediaItems_duplicate',
  description: 'Duplicate a media item',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'The media item to duplicate',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    await client.mediaItems.duplicate(
      id as unknown as Parameters<typeof client.mediaItems.duplicate>[0]
    )
    return { success: true }
  },
}

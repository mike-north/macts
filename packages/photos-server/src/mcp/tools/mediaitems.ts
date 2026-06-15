/**
 * MCP tools for Photos.app mediaitems operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all media items
 */
export const mediaitemsListTool: McpToolDefinition = {
  name: 'macts__photos__mediaitems_list',
  description: 'List all media items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.mediaitems.list()
  },
}

/**
 * Get a media item by ID
 */
export const mediaitemsGetTool: McpToolDefinition = {
  name: 'macts__photos__mediaitems_get',
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
    return client.mediaitems.get(id as unknown as Parameters<typeof client.mediaitems.get>[0])
  },
}

/**
 * Duplicate a media item
 */
export const mediaitemsDuplicateTool: McpToolDefinition = {
  name: 'macts__photos__mediaitems_duplicate',
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
    await client.mediaitems.duplicate(
      id as unknown as Parameters<typeof client.mediaitems.duplicate>[0]
    )
    return { success: true }
  },
}

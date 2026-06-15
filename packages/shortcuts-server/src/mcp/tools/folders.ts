/**
 * MCP tools for Shortcuts.app folders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all folders
 */
export const foldersListTool: McpToolDefinition = {
  name: 'macts__shortcuts__folders_list',
  description: 'List all folders',
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
 * Get a folder by ID
 */
export const foldersGetTool: McpToolDefinition = {
  name: 'macts__shortcuts__folders_get',
  description: 'Get a folder by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Folder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.folders.get(id as unknown as Parameters<typeof client.folders.get>[0])
  },
}

/**
 * MCP tools for Omnifocus.app folders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all folders
 */
export const foldersListTool: McpToolDefinition = {
  name: 'macts__omnifocus__folders_list',
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
  name: 'macts__omnifocus__folders_get',
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

/**
 * Create a new folder
 */
export const foldersCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__folders_create',
  description: 'Create a new folder',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Folder name',
        type: 'string',
      },
      note: {
        description: 'Folder note',
        type: 'string',
      },
      hidden: {
        description: 'Set if the folder is currently hidden',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['name', 'hidden'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.folders.create(args as Parameters<typeof client.folders.create>[0])
  },
}

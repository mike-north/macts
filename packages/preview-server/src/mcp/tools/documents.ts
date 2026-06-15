/**
 * MCP tools for Preview.app documents operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all open documents
 */
export const documentsListTool: McpToolDefinition = {
  name: 'macts__preview__documents_list',
  description: 'List all open documents',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.documents.list()
  },
}

/**
 * Get a document by name
 */
export const documentsGetTool: McpToolDefinition = {
  name: 'macts__preview__documents_get',
  description: 'Get a document by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.documents.get(name as unknown as Parameters<typeof client.documents.get>[0])
  },
}

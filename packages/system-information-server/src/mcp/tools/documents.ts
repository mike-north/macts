/**
 * MCP tools for System-information.app documents operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all system profile documents
 */
export const documentsListTool: McpToolDefinition = {
  name: 'macts__system-information__documents_list',
  description: 'List all system profile documents',
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
 * Get a system profile document by name
 */
export const documentsGetTool: McpToolDefinition = {
  name: 'macts__system-information__documents_get',
  description: 'Get a system profile document by name',
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

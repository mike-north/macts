/**
 * MCP tools for Terminal.app windows operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const windowsListTool: McpToolDefinition = {
  name: 'macts__terminal__windows_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.windows.list()
  },
}

/**
 * Get an item by identifier
 */
export const windowsGetTool: McpToolDefinition = {
  name: 'macts__terminal__windows_get',
  description: 'Get an item by identifier',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Item identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.windows.get(name)
  },
}

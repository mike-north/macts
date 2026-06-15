/**
 * MCP tools for Screen-sharing.app connections operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all screen sharing connections
 */
export const connectionsListTool: McpToolDefinition = {
  name: 'macts__screen-sharing__connections_list',
  description: 'List all screen sharing connections',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.connections.list()
  },
}

/**
 * Get a connection by ID
 */
export const connectionsGetTool: McpToolDefinition = {
  name: 'macts__screen-sharing__connections_get',
  description: 'Get a connection by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Connection identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.connections.get(id as unknown as Parameters<typeof client.connections.get>[0])
  },
}

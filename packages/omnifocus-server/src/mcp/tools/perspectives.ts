/**
 * MCP tools for Omnifocus.app perspectives operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all perspectives
 */
export const perspectivesListTool: McpToolDefinition = {
  name: 'macts__omnifocus__perspectives_list',
  description: 'List all perspectives',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.perspectives.list()
  },
}

/**
 * Get a perspective by ID
 */
export const perspectivesGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__perspectives_get',
  description: 'Get a perspective by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Perspective identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.perspectives.get(id as unknown as Parameters<typeof client.perspectives.get>[0])
  },
}

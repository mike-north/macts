/**
 * MCP tools for Reminders.app lists operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all reminder lists
 */
export const listsListTool: McpToolDefinition = {
  name: 'macts__reminders__lists_list',
  description: 'List all reminder lists',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.lists.list()
  },
}

/**
 * Get a reminder list by ID
 */
export const listsGetTool: McpToolDefinition = {
  name: 'macts__reminders__lists_get',
  description: 'Get a reminder list by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'List identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.lists.get(id as unknown as Parameters<typeof client.lists.get>[0])
  },
}

/**
 * Create a new reminder list
 */
export const listsCreateTool: McpToolDefinition = {
  name: 'macts__reminders__lists_create',
  description: 'Create a new reminder list',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'List name',
        type: 'string',
      },
      color: {
        description: 'List color',
        type: 'object',
      },
      emblem: {
        description: 'The emblem icon name of the list',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name', 'emblem'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.lists.create(args as Parameters<typeof client.lists.create>[0])
  },
}

/**
 * MCP tools for Omnifocus.app inboxtasks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all inbox tasks
 */
export const inboxtasksListTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxtasks_list',
  description: 'List all inbox tasks',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.inboxtasks.list()
  },
}

/**
 * Get an inbox task by ID
 */
export const inboxtasksGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxtasks_get',
  description: 'Get an inbox task by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Inbox task identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.inboxtasks.get(id as unknown as Parameters<typeof client.inboxtasks.get>[0])
  },
}

/**
 * Create a new inbox task
 */
export const inboxtasksCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxtasks_create',
  description: 'Create a new inbox task',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Task name',
        type: 'string',
      },
      note: {
        description: 'Task note',
        type: 'string',
      },
      flagged: {
        description: 'True if flagged',
        type: 'boolean',
      },
      deferDate: {
        description: 'When the task should become available for action',
        type: 'string',
      },
      dueDate: {
        description: 'When the task must be finished',
        type: 'string',
      },
      creationDate: {
        description: 'When the task was created',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name', 'flagged', 'deferDate', 'dueDate', 'creationDate'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.inboxtasks.create(args as Parameters<typeof client.inboxtasks.create>[0])
  },
}

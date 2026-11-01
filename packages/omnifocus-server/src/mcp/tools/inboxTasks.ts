/**
 * MCP tools for Omnifocus.app inboxTasks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all inbox tasks
 */
export const inboxTasksListTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxTasks_list',
  description: 'List all inbox tasks',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.inboxTasks.list()
  },
}

/**
 * Get an inbox task by ID
 */
export const inboxTasksGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxTasks_get',
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
    return client.inboxTasks.get(id as unknown as Parameters<typeof client.inboxTasks.get>[0])
  },
}

/**
 * Create a new inbox task
 */
export const inboxTasksCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__inboxTasks_create',
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
    return client.inboxTasks.create(args as Parameters<typeof client.inboxTasks.create>[0])
  },
}

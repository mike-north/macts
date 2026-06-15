/**
 * MCP tools for Omniplan.app tasks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all tasks
 */
export const tasksListTool: McpToolDefinition = {
  name: 'macts__omniplan__tasks_list',
  description: 'List all tasks',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.tasks.list()
  },
}

/**
 * Get a task by ID
 */
export const tasksGetTool: McpToolDefinition = {
  name: 'macts__omniplan__tasks_get',
  description: 'Get a task by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Task identifier',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: number }
    const client = getClient()
    return client.tasks.get(id as unknown as Parameters<typeof client.tasks.get>[0])
  },
}

/**
 * Create a new task
 */
export const tasksCreateTool: McpToolDefinition = {
  name: 'macts__omniplan__tasks_create',
  description: 'Create a new task',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Task name',
        type: 'string',
      },
      startingDate: {
        description: 'Start date',
        type: 'string',
      },
      duration: {
        description: 'Duration in seconds',
        type: 'number',
      },
      endingDate: {
        description: 'The date on which work ends',
        type: 'string',
      },
      effort: {
        description: 'The number of person-seconds required to perform the task',
        type: 'number',
      },
      completed: {
        description: 'The percentage of the task which is complete (1.0 = 100%)',
        type: 'number',
      },
      completedEffort: {
        description: 'The person-seconds completed',
        type: 'number',
      },
      priority: {
        description: 'Priority of this task',
        type: 'number',
      },
      taskType: {
        description: 'Whether this task is a standard task, milestone, group, or hammock',
        type: 'string',
      },
      staticCost: {
        description: 'Cost for this task itself',
        type: 'number',
      },
      startingConstraintDate: {
        description: 'The earliest date this task may start',
        type: 'string',
      },
      endingConstraintDate: {
        description: 'The latest date this task may end',
        type: 'string',
      },
      startingDateLocked: {
        description: 'Whether the start date is locked or not',
        type: 'boolean',
      },
      endingDateLocked: {
        description: 'Whether the end date is locked or not',
        type: 'boolean',
      },
      note: {
        description: 'Notes',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: [
      'name',
      'endingDate',
      'effort',
      'completed',
      'completedEffort',
      'priority',
      'taskType',
      'staticCost',
      'startingConstraintDate',
      'endingConstraintDate',
      'startingDateLocked',
      'endingDateLocked',
      'note',
    ],
  },
  handler: async (args) => {
    const client = getClient()
    return client.tasks.create(args as Parameters<typeof client.tasks.create>[0])
  },
}

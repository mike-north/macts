/**
 * MCP tools for Reminders.app reminders operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all reminders in a list
 */
export const remindersListTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_list',
  description: 'List all reminders in a list',
  inputSchema: {
    type: 'object',
    properties: {
      listId: {
        description: 'List identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['listId'],
  },
  handler: async (args) => {
    const { listId } = args as { listId: string }
    void listId
    const client = getClient()
    return client.reminders.list()
  },
}

/**
 * Get a reminder by ID
 */
export const remindersGetTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_get',
  description: 'Get a reminder by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Reminder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.reminders.get(id as unknown as Parameters<typeof client.reminders.get>[0])
  },
}

/**
 * Create a new reminder
 */
export const remindersCreateTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_create',
  description: 'Create a new reminder',
  inputSchema: {
    type: 'object',
    properties: {
      listId: {
        description: 'List identifier for the reminder',
        type: 'string',
      },
      name: {
        description: 'Reminder name',
        type: 'string',
      },
      body: {
        description: 'Reminder notes',
        type: 'string',
      },
      dueDate: {
        description: 'Due date',
        type: 'string',
      },
      remindMeDate: {
        description: 'Remind me date',
        type: 'string',
      },
      priority: {
        description: 'Priority (0=none, 1=high, 5=medium, 9=low)',
        type: 'number',
      },
      flagged: {
        description: 'Whether to flag the reminder',
        type: 'boolean',
      },
      completed: {
        description: 'Whether the reminder is completed',
        type: 'boolean',
      },
      allDayDueDate: {
        description: 'The all-day due date of the reminder',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['listId', 'name', 'completed', 'allDayDueDate'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.reminders.create(args as Parameters<typeof client.reminders.create>[0])
  },
}

/**
 * Delete a reminder
 */
export const remindersDeleteTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_delete',
  description: 'Delete a reminder',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Reminder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    await client.reminders.delete(id as unknown as Parameters<typeof client.reminders.delete>[0])
    return { success: true, message: `Deleted Reminder ${id}` }
  },
}

/**
 * Mark a reminder as complete
 */
export const remindersCompleteTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_complete',
  description: 'Mark a reminder as complete',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Reminder identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    await client.reminders.complete(
      id as unknown as Parameters<typeof client.reminders.complete>[0]
    )
    return { success: true }
  },
}

/**
 * Show the reminder in Reminders.app UI
 */
export const remindersShowTool: McpToolDefinition = {
  name: 'macts__reminders__reminders_show',
  description: 'Show the reminder in Reminders.app UI',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.reminders.show()
    return { success: true }
  },
}

/**
 * MCP tools for Omniplan.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Export a document
 */
export const appExportTool: McpToolDefinition = {
  name: 'macts__omniplan__app_export',
  description: 'Export a document',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'Export file path',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client._export(to as unknown as Parameters<typeof client._export>[0])
    return { success: true }
  },
}

/**
 * Assign resources to tasks
 */
export const appAssignTool: McpToolDefinition = {
  name: 'macts__omniplan__app_assign',
  description: 'Assign resources to tasks',
  inputSchema: {
    type: 'object',
    properties: {
      resource: {
        description: 'Resource to assign',
        type: 'string',
      },
      task: {
        description: 'Task to assign to',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['resource', 'task'],
  },
  handler: async (args) => {
    const { resource, task } = args as { resource: string; task: string }
    const client = getClient()
    await client.assign(
      resource as unknown as Parameters<typeof client.assign>[0],
      task as unknown as Parameters<typeof client.assign>[1]
    )
    return { success: true }
  },
}

/**
 * Create a dependency between tasks
 */
export const appDependTool: McpToolDefinition = {
  name: 'macts__omniplan__app_depend',
  description: 'Create a dependency between tasks',
  inputSchema: {
    type: 'object',
    properties: {
      prerequisite: {
        description: 'Prerequisite task',
        type: 'string',
      },
      dependent: {
        description: 'Dependent task',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['prerequisite', 'dependent'],
  },
  handler: async (args) => {
    const { prerequisite, dependent } = args as { prerequisite: string; dependent: string }
    const client = getClient()
    await client.depend(
      prerequisite as unknown as Parameters<typeof client.depend>[0],
      dependent as unknown as Parameters<typeof client.depend>[1]
    )
    return { success: true }
  },
}

/**
 * Commit the current schedule as the baseline schedule
 */
export const appBaselineTool: McpToolDefinition = {
  name: 'macts__omniplan__app_baseline',
  description: 'Commit the current schedule as the baseline schedule',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.baseline()
    return { success: true }
  },
}

/**
 * Level resources on project
 */
export const appLevelTool: McpToolDefinition = {
  name: 'macts__omniplan__app_level',
  description: 'Level resources on project',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.level()
    return { success: true }
  },
}

/**
 * Look up a task via a custom data key
 */
export const appLookupTool: McpToolDefinition = {
  name: 'macts__omniplan__app_lookup',
  description: 'Look up a task via a custom data key',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        description: 'Custom data key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['key'],
  },
  handler: async (args) => {
    const { key } = args as { key: string }
    const client = getClient()
    await client.lookup(key as unknown as Parameters<typeof client.lookup>[0])
    return { success: true }
  },
}

/**
 * Make a change tracking mark on project
 */
export const appChangeMarkTool: McpToolDefinition = {
  name: 'macts__omniplan__app_change_mark',
  description: 'Make a change tracking mark on project',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.changeMark()
    return { success: true }
  },
}

/**
 * Add working hours to a schedule
 */
export const appAddWorkTimeTool: McpToolDefinition = {
  name: 'macts__omniplan__app_add_work_time',
  description: 'Add working hours to a schedule',
  inputSchema: {
    type: 'object',
    properties: {
      schedule: {
        description: 'Target schedule',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['schedule'],
  },
  handler: async (args) => {
    const { schedule } = args as { schedule: string }
    const client = getClient()
    await client.addWorkTime(schedule as unknown as Parameters<typeof client.addWorkTime>[0])
    return { success: true }
  },
}

/**
 * Remove working hours from a schedule
 */
export const appSubtractWorkTimeTool: McpToolDefinition = {
  name: 'macts__omniplan__app_subtract_work_time',
  description: 'Remove working hours from a schedule',
  inputSchema: {
    type: 'object',
    properties: {
      schedule: {
        description: 'Target schedule',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['schedule'],
  },
  handler: async (args) => {
    const { schedule } = args as { schedule: string }
    const client = getClient()
    await client.subtractWorkTime(
      schedule as unknown as Parameters<typeof client.subtractWorkTime>[0]
    )
    return { success: true }
  },
}

/**
 * Undo the last command
 */
export const appUndoTool: McpToolDefinition = {
  name: 'macts__omniplan__app_undo',
  description: 'Undo the last command',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.undo()
    return { success: true }
  },
}

/**
 * Redo the last undone command
 */
export const appRedoTool: McpToolDefinition = {
  name: 'macts__omniplan__app_redo',
  description: 'Redo the last undone command',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.redo()
    return { success: true }
  },
}

/**
 * MCP tools for Omniplan.app milestones operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all milestones
 */
export const milestonesListTool: McpToolDefinition = {
  name: 'macts__omniplan__milestones_list',
  description: 'List all milestones',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.milestones.list()
  },
}

/**
 * Get a milestone by ID
 */
export const milestonesGetTool: McpToolDefinition = {
  name: 'macts__omniplan__milestones_get',
  description: 'Get a milestone by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Milestone identifier',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: number }
    const client = getClient()
    return client.milestones.get(id)
  },
}

/**
 * Create a new milestone
 */
export const milestonesCreateTool: McpToolDefinition = {
  name: 'macts__omniplan__milestones_create',
  description: 'Create a new milestone',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Milestone name',
        type: 'string',
      },
      startingDate: {
        description: 'Milestone date',
        type: 'string',
      },
      note: {
        description: 'Notes',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name', 'note'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.milestones.create(args as Record<string, unknown>)
  },
}

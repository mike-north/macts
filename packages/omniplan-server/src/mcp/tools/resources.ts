/**
 * MCP tools for Omniplan.app resources operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all resources
 */
export const resourcesListTool: McpToolDefinition = {
  name: 'macts__omniplan__resources_list',
  description: 'List all resources',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.resources.list()
  },
}

/**
 * Get a resource by ID
 */
export const resourcesGetTool: McpToolDefinition = {
  name: 'macts__omniplan__resources_get',
  description: 'Get a resource by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Resource identifier',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: number }
    const client = getClient()
    return client.resources.get(id)
  },
}

/**
 * Create a new resource
 */
export const resourcesCreateTool: McpToolDefinition = {
  name: 'macts__omniplan__resources_create',
  description: 'Create a new resource',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Resource name',
        type: 'string',
      },
      resourceType: {
        description: 'Resource type',
        type: 'string',
      },
      number: {
        description: 'The total number of units for this resource (1.0 = 100%)',
        type: 'number',
      },
      emailAddress: {
        description: 'Email address for this resource',
        type: 'string',
      },
      costPerUse: {
        description: 'The fixed cost per use of this resource',
        type: 'number',
      },
      costPerHour: {
        description: 'The cost per hour of this resource',
        type: 'number',
      },
      efficiency: {
        description: 'Resource efficiency (1.0 = 100%)',
        type: 'number',
      },
      note: {
        description: 'Notes',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name', 'number', 'emailAddress', 'costPerUse', 'costPerHour', 'efficiency', 'note'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.resources.create(args as Record<string, unknown>)
  },
}

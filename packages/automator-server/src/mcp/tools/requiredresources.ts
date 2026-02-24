/**
 * MCP tools for Automator.app requiredresources operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all required resources for an action
 */
export const requiredresourcesListTool: McpToolDefinition = {
  name: 'macts__automator__requiredresources_list',
  description: 'List all required resources for an action',
  inputSchema: {
    type: 'object',
    properties: {
      actionId: {
        description: 'Action identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['actionId'],
  },
  handler: async (args) => {
    const { actionId } = args as { actionId: string }
    void actionId
    const client = getClient()
    return client.requiredresources.list()
  },
}

/**
 * Get a required resource by name
 */
export const requiredresourcesGetTool: McpToolDefinition = {
  name: 'macts__automator__requiredresources_get',
  description: 'Get a required resource by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Resource name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.requiredresources.get(name)
  },
}

/**
 * MCP tools for Automator.app variables operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all variables in a workflow
 */
export const variablesListTool: McpToolDefinition = {
  name: 'macts__automator__variables_list',
  description: 'List all variables in a workflow',
  inputSchema: {
    type: 'object',
    properties: {
      workflowName: {
        description: 'Workflow name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workflowName'],
  },
  handler: async (args) => {
    const { workflowName } = args as { workflowName: string }

    const client = getClient()
    return client.variables.list(workflowName)
  },
}

/**
 * Get a variable by ID
 */
export const variablesGetTool: McpToolDefinition = {
  name: 'macts__automator__variables_get',
  description: 'Get a variable by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Variable identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.variables.get(id as unknown as Parameters<typeof client.variables.get>[0])
  },
}

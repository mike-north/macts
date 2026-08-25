/**
 * MCP tools for Automator.app automatoractions operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all actions in a workflow
 */
export const automatoractionsListTool: McpToolDefinition = {
  name: 'macts__automator__automatoractions_list',
  description: 'List all actions in a workflow',
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
    return client.automatoractions.list(workflowName)
  },
}

/**
 * Get an action by ID
 */
export const automatoractionsGetTool: McpToolDefinition = {
  name: 'macts__automator__automatoractions_get',
  description: 'Get an action by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Action identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.automatoractions.get(
      id as unknown as Parameters<typeof client.automatoractions.get>[0]
    )
  },
}

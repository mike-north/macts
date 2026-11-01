/**
 * MCP tools for Automator.app requiredResources operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all required resources for an action
 */
export const requiredResourcesListTool: McpToolDefinition = {
  name: 'macts__automator__requiredResources_list',
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

    const client = getClient()
    return client.requiredResources.list(actionId)
  },
}

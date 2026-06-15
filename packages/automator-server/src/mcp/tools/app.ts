/**
 * MCP tools for Automator.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Add an Automator action or variable to a workflow
 */
export const appAddTool: McpToolDefinition = {
  name: 'macts__automator__app_add',
  description: 'Add an Automator action or variable to a workflow',
  inputSchema: {
    type: 'object',
    properties: {
      object: {
        description: 'The Automator action or variable to add',
        type: 'string',
      },
      to: {
        description: 'The workflow to which the action or variable is to be added',
        type: 'string',
      },
      atIndex: {
        description: 'The index at which the action or variable is to be added',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: ['object', 'to'],
  },
  handler: async (args) => {
    const { object, to, atIndex } = args as { object: string; to: string; atIndex?: number }
    const client = getClient()
    await client.add(
      object as unknown as Parameters<typeof client.add>[0],
      to as unknown as Parameters<typeof client.add>[1],
      atIndex as unknown as Parameters<typeof client.add>[2]
    )
    return { success: true }
  },
}

/**
 * Remove an Automator action or variable from a workflow
 */
export const appRemoveTool: McpToolDefinition = {
  name: 'macts__automator__app_remove',
  description: 'Remove an Automator action or variable from a workflow',
  inputSchema: {
    type: 'object',
    properties: {
      object: {
        description: 'The Automator action or variable to remove',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['object'],
  },
  handler: async (args) => {
    const { object } = args as { object: string }
    const client = getClient()
    await client.remove(object as unknown as Parameters<typeof client.remove>[0])
    return { success: true }
  },
}

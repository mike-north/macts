/**
 * MCP tools for Automator.app settings operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all settings for an action
 */
export const settingsListTool: McpToolDefinition = {
  name: 'macts__automator__settings_list',
  description: 'List all settings for an action',
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
    return client.settings.list(actionId)
  },
}

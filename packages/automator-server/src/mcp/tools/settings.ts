/**
 * MCP tools for Automator.app settings operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
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
    void actionId
    const client = getClient()
    return client.settings.list()
  },
}

/**
 * Get a setting by name
 */
export const settingsGetTool: McpToolDefinition = {
  name: 'macts__automator__settings_get',
  description: 'Get a setting by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Setting name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.settings.get(name as unknown as Parameters<typeof client.settings.get>[0])
  },
}

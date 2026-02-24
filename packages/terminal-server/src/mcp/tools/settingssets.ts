/**
 * MCP tools for Terminal.app settingssets operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const settingssetsListTool: McpToolDefinition = {
  name: 'macts__terminal__settingssets_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.settingssets.list()
  },
}

/**
 * Get an item by identifier
 */
export const settingssetsGetTool: McpToolDefinition = {
  name: 'macts__terminal__settingssets_get',
  description: 'Get an item by identifier',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Item identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.settingssets.get(name)
  },
}

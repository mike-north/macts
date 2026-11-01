/**
 * MCP tools for Terminal.app settingsSets operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const settingsSetsListTool: McpToolDefinition = {
  name: 'macts__terminal__settingsSets_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.settingsSets.list()
  },
}

/**
 * Get an item by identifier
 */
export const settingsSetsGetTool: McpToolDefinition = {
  name: 'macts__terminal__settingsSets_get',
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
    return client.settingsSets.get(name as unknown as Parameters<typeof client.settingsSets.get>[0])
  },
}

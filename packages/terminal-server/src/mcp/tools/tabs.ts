/**
 * MCP tools for Terminal.app tabs operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List items
 */
export const tabsListTool: McpToolDefinition = {
  name: 'macts__terminal__tabs_list',
  description: 'List items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.tabs.list()
  },
}

/**
 * Get an item by identifier
 */
export const tabsGetTool: McpToolDefinition = {
  name: 'macts__terminal__tabs_get',
  description: 'Get an item by identifier',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Item identifier',
        type: 'string',
      },
      tty: {
        description: 'The tty device of the tab',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string; tty?: string }
    const client = getClient()
    return client.tabs.get(name as unknown as Parameters<typeof client.tabs.get>[0])
  },
}

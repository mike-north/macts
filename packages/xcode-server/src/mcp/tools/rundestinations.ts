/**
 * MCP tools for Xcode.app rundestinations operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all run destinations in a workspace
 */
export const rundestinationsListTool: McpToolDefinition = {
  name: 'macts__xcode__rundestinations_list',
  description: 'List all run destinations in a workspace',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as { workspaceName: string }

    const client = getClient()
    return client.rundestinations.list(workspaceName)
  },
}

/**
 * Get a run destination by name
 */
export const rundestinationsGetTool: McpToolDefinition = {
  name: 'macts__xcode__rundestinations_get',
  description: 'Get a run destination by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Run destination name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.rundestinations.get(
      name as unknown as Parameters<typeof client.rundestinations.get>[0]
    )
  },
}

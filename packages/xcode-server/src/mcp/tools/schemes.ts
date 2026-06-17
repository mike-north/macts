/**
 * MCP tools for Xcode.app schemes operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all schemes in a workspace
 */
export const schemesListTool: McpToolDefinition = {
  name: 'macts__xcode__schemes_list',
  description: 'List all schemes in a workspace',
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
    return client.schemes.list(workspaceName)
  },
}

/**
 * Get a scheme by ID
 */
export const schemesGetTool: McpToolDefinition = {
  name: 'macts__xcode__schemes_get',
  description: 'Get a scheme by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Scheme identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.schemes.get(id as unknown as Parameters<typeof client.schemes.get>[0])
  },
}

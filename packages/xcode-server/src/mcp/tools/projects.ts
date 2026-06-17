/**
 * MCP tools for Xcode.app projects operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all projects in a workspace
 */
export const projectsListTool: McpToolDefinition = {
  name: 'macts__xcode__projects_list',
  description: 'List all projects in a workspace',
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
    void workspaceName
    const client = getClient()
    return client.projects.list()
  },
}

/**
 * Get a project by ID
 */
export const projectsGetTool: McpToolDefinition = {
  name: 'macts__xcode__projects_get',
  description: 'Get a project by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Project identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.projects.get(id as unknown as Parameters<typeof client.projects.get>[0])
  },
}

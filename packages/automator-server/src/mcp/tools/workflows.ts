/**
 * MCP tools for Automator.app workflows operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all workflows
 */
export const workflowsListTool: McpToolDefinition = {
  name: 'macts__automator__workflows_list',
  description: 'List all workflows',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.workflows.list()
  },
}

/**
 * Get a workflow by name
 */
export const workflowsGetTool: McpToolDefinition = {
  name: 'macts__automator__workflows_get',
  description: 'Get a workflow by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Workflow name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.workflows.get(name as unknown as Parameters<typeof client.workflows.get>[0])
  },
}

/**
 * Execute a workflow
 */
export const workflowsExecuteTool: McpToolDefinition = {
  name: 'macts__automator__workflows_execute',
  description: 'Execute a workflow',
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        description: 'The workflow to execute',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workflow'],
  },
  handler: async (args) => {
    const { workflow } = args as { workflow: string }
    const client = getClient()
    await client.workflows.execute(
      workflow as unknown as Parameters<typeof client.workflows.execute>[0]
    )
    return { success: true }
  },
}

/**
 * MCP tools for Omniplan.app dependencies operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all dependencies
 */
export const dependenciesListTool: McpToolDefinition = {
  name: 'macts__omniplan__dependencies_list',
  description: 'List all dependencies',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.dependencies.list()
  },
}

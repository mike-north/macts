/**
 * MCP tools for Omnigraffle.app lines operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all lines on a canvas
 */
export const linesListTool: McpToolDefinition = {
  name: 'macts__omnigraffle__lines_list',
  description: 'List all lines on a canvas',
  inputSchema: {
    type: 'object',
    properties: {
      canvasId: {
        description: 'Canvas identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['canvasId'],
  },
  handler: async (args) => {
    const { canvasId } = args as { canvasId: string }
    void canvasId
    const client = getClient()
    return client.lines.list()
  },
}

/**
 * Get a line by ID
 */
export const linesGetTool: McpToolDefinition = {
  name: 'macts__omnigraffle__lines_get',
  description: 'Get a line by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Line identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.lines.get(id as unknown as Parameters<typeof client.lines.get>[0])
  },
}

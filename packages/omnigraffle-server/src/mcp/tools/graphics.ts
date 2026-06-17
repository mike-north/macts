/**
 * MCP tools for Omnigraffle.app graphics operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all graphics on a canvas
 */
export const graphicsListTool: McpToolDefinition = {
  name: 'macts__omnigraffle__graphics_list',
  description: 'List all graphics on a canvas',
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

    const client = getClient()
    return client.graphics.list(canvasId)
  },
}

/**
 * Get a graphic by ID
 */
export const graphicsGetTool: McpToolDefinition = {
  name: 'macts__omnigraffle__graphics_get',
  description: 'Get a graphic by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Graphic identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.graphics.get(id as unknown as Parameters<typeof client.graphics.get>[0])
  },
}

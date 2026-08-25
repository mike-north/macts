/**
 * MCP tools for Omnigraffle.app layers operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all layers on a canvas
 */
export const layersListTool: McpToolDefinition = {
  name: 'macts__omnigraffle__layers_list',
  description: 'List all layers on a canvas',
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
    return client.layers.list(canvasId)
  },
}

/**
 * Get a layer by name
 */
export const layersGetTool: McpToolDefinition = {
  name: 'macts__omnigraffle__layers_get',
  description: 'Get a layer by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Layer name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.layers.get(name as unknown as Parameters<typeof client.layers.get>[0])
  },
}

/**
 * Create a new layer
 */
export const layersCreateTool: McpToolDefinition = {
  name: 'macts__omnigraffle__layers_create',
  description: 'Create a new layer',
  inputSchema: {
    type: 'object',
    properties: {
      canvasId: {
        description: 'Canvas identifier for the layer',
        type: 'string',
      },
      name: {
        description: 'Layer name',
        type: 'string',
      },
      locked: {
        description: "Are the layer's graphics locked?",
        type: 'boolean',
      },
      visible: {
        description: "Are the layer's graphics visible?",
        type: 'boolean',
      },
      prints: {
        description: "Do the layer's graphics print?",
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['canvasId', 'name', 'locked', 'visible', 'prints'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.layers.create(args as Parameters<typeof client.layers.create>[0])
  },
}

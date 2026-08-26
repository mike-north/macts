/**
 * MCP tools for Omnigraffle.app canvases operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all canvases
 */
export const canvasesListTool: McpToolDefinition = {
  name: 'macts__omnigraffle__canvases_list',
  description: 'List all canvases',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.canvases.list()
  },
}

/**
 * Get a canvas by ID
 */
export const canvasesGetTool: McpToolDefinition = {
  name: 'macts__omnigraffle__canvases_get',
  description: 'Get a canvas by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Canvas identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.canvases.get(id as unknown as Parameters<typeof client.canvases.get>[0])
  },
}

/**
 * Create a new canvas
 */
export const canvasesCreateTool: McpToolDefinition = {
  name: 'macts__omnigraffle__canvases_create',
  description: 'Create a new canvas',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Canvas name',
        type: 'string',
      },
      id: {
        description: 'Unique identifier',
        type: 'string',
      },
      adjustsPages: {
        description: 'Adjust number of pages on the canvas automatically?',
        type: 'boolean',
      },
      canvasSizeIsMeasuredInPages: {
        description: 'Whether canvas size is reported as multiples of page size',
        type: 'boolean',
      },
      canvasSize: {
        description: 'Size of the canvas (page size multiplied by number of pages)',
        type: 'object',
      },
      horizontalPages: {
        description: 'Horizontal pages',
        type: 'number',
      },
      verticalPages: {
        description: 'Vertical pages',
        type: 'number',
      },
      columnAlignment: {
        description: 'Column alignment',
        type: 'string',
      },
      rowAlignment: {
        description: 'Row alignment',
        type: 'string',
      },
      columnSpacing: {
        description: 'Spacing between graphics in a column',
        type: 'number',
      },
      rowSpacing: {
        description: 'Spacing between graphics in a row',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: [
      'name',
      'adjustsPages',
      'canvasSizeIsMeasuredInPages',
      'canvasSize',
      'horizontalPages',
      'verticalPages',
      'columnAlignment',
      'rowAlignment',
      'columnSpacing',
      'rowSpacing',
    ],
  },
  handler: async (args) => {
    const client = getClient()
    return client.canvases.create(args as Parameters<typeof client.canvases.create>[0])
  },
}

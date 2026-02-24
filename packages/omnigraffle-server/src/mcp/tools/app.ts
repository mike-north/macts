/**
 * MCP tools for Omnigraffle.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Draw a line between graphics
 */
export const appConnectTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_connect',
  description: 'Draw a line between graphics',
  inputSchema: {
    type: 'object',
    properties: {
      from: {
        description: 'Source graphic ID',
        type: 'string',
      },
      to: {
        description: 'Destination graphic ID',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['from', 'to'],
  },
  handler: async (args) => {
    const { from, to } = args as { from: string; to: string }
    const client = getClient()
    await client.connect(from as unknown, to as unknown)
    return { success: true }
  },
}

/**
 * Layout graphics using the document's Layout Info
 */
export const appLayoutTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_layout',
  description: "Layout graphics using the document's Layout Info",
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.layout()
    return { success: true }
  },
}

/**
 * Export documents
 */
export const appExportTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_export',
  description: 'Export documents',
  inputSchema: {
    type: 'object',
    properties: {
      as: {
        description: 'File type',
        type: 'string',
      },
      scope: {
        description: 'Area to export',
        type: 'string',
      },
      to: {
        description: 'Output file path',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['as', 'scope', 'to'],
  },
  handler: async (args) => {
    const { as, scope, to } = args as { as: string; scope: string; to: string }
    const client = getClient()
    await client._export(as as unknown, scope as unknown, to as unknown)
    return { success: true }
  },
}

/**
 * Flip graphics
 */
export const appFlipTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_flip',
  description: 'Flip graphics',
  inputSchema: {
    type: 'object',
    properties: {
      over: {
        description: 'Flip orientation',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['over'],
  },
  handler: async (args) => {
    const { over } = args as { over: string }
    const client = getClient()
    await client.flip(over as unknown)
    return { success: true }
  },
}

/**
 * Slide graphics by a vector amount
 */
export const appSlideTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_slide',
  description: 'Slide graphics by a vector amount',
  inputSchema: {
    type: 'object',
    properties: {
      by: {
        description: 'Vector to slide by',
        type: 'object',
      },
    },
    additionalProperties: false,
    required: ['by'],
  },
  handler: async (args) => {
    const { by } = args as { by: Record<string, unknown> }
    const client = getClient()
    await client.slide(by as unknown)
    return { success: true }
  },
}

/**
 * Group graphics
 */
export const appAssembleTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_assemble',
  description: 'Group graphics',
  inputSchema: {
    type: 'object',
    properties: {
      subgraph: {
        description: 'Create as subgraph',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { subgraph } = args as { subgraph?: boolean }
    const client = getClient()
    await client.assemble(subgraph as unknown)
    return { success: true }
  },
}

/**
 * Change the number of pages to fit the current graphics
 */
export const appPageAdjustTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_page_adjust',
  description: 'Change the number of pages to fit the current graphics',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.pageAdjust()
    return { success: true }
  },
}

/**
 * Evaluate JavaScript and return the result
 */
export const appEvaluateJavascriptTool: McpToolDefinition = {
  name: 'macts__omnigraffle__app_evaluate_javascript',
  description: 'Evaluate JavaScript and return the result',
  inputSchema: {
    type: 'object',
    properties: {
      script: {
        description: 'JavaScript code to evaluate',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['script'],
  },
  handler: async (args) => {
    const { script } = args as { script: string }
    const client = getClient()
    await client.evaluateJavascript(script as unknown)
    return { success: true }
  },
}

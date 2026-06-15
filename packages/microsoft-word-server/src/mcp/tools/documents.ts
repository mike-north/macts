/**
 * MCP tools for Microsoft-word.app documents operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all documents
 */
export const documentsListTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_list',
  description: 'List all documents',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.documents.list()
  },
}

/**
 * Get a document by name
 */
export const documentsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_get',
  description: 'Get a document by name',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Document name',
        type: 'string',
      },
      name: {
        description: 'The name of the document',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id', 'name'],
  },
  handler: async (args) => {
    const { id } = args as { id: string; name: string }
    const client = getClient()
    return client.documents.get(id as unknown as Parameters<typeof client.documents.get>[0])
  },
}

/**
 * Save the specified document
 */
export const documentsSaveTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_save',
  description: 'Save the specified document',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.documents.save()
    return { success: true }
  },
}

/**
 * Save the document with a new name or format
 */
export const documentsSaveAsTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_save_as',
  description: 'Save the document with a new name or format',
  inputSchema: {
    type: 'object',
    properties: {
      fileName: {
        description: 'The file name for the document',
        type: 'string',
      },
      fileFormat: {
        description: 'The file format for saving',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['fileName'],
  },
  handler: async (args) => {
    const { fileName, fileFormat } = args as { fileName: string; fileFormat?: string }
    const client = getClient()
    await client.documents.saveAs(
      fileName as unknown as Parameters<typeof client.documents.saveAs>[0],
      fileFormat as unknown as Parameters<typeof client.documents.saveAs>[1]
    )
    return { success: true }
  },
}

/**
 * Close the specified document
 */
export const documentsCloseTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_close',
  description: 'Close the specified document',
  inputSchema: {
    type: 'object',
    properties: {
      saving: {
        description: 'Whether to save changes before closing',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { saving } = args as { saving?: boolean }
    const client = getClient()
    await client.documents.close(saving as unknown as Parameters<typeof client.documents.close>[0])
    return { success: true }
  },
}

/**
 * Print the specified document
 */
export const documentsPrintTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_print',
  description: 'Print the specified document',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.documents.print()
    return { success: true }
  },
}

/**
 * Activate the specified document window
 */
export const documentsActivateTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_activate',
  description: 'Activate the specified document window',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.documents.activate()
    return { success: true }
  },
}

/**
 * Create a text range by character positions
 */
export const documentsCreateRangeTool: McpToolDefinition = {
  name: 'macts__microsoft-word__documents_create_range',
  description: 'Create a text range by character positions',
  inputSchema: {
    type: 'object',
    properties: {
      start: {
        description: 'The starting character position',
        type: 'number',
      },
      end: {
        description: 'The ending character position',
        type: 'number',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { start, end } = args as { start?: number; end?: number }
    const client = getClient()
    await client.documents.createRange(
      start as unknown as Parameters<typeof client.documents.createRange>[0],
      end as unknown as Parameters<typeof client.documents.createRange>[1]
    )
    return { success: true }
  },
}

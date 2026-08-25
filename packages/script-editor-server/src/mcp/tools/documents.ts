/**
 * MCP tools for Script-editor.app documents operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * List all open script documents
 */
export const documentsListTool: McpToolDefinition = {
  name: 'macts__script-editor__documents_list',
  description: 'List all open script documents',
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
 * Get a script document by name
 */
export const documentsGetTool: McpToolDefinition = {
  name: 'macts__script-editor__documents_get',
  description: 'Get a script document by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.documents.get(name as unknown as Parameters<typeof client.documents.get>[0])
  },
}

/**
 * Create a new script document
 */
export const documentsCreateTool: McpToolDefinition = {
  name: 'macts__script-editor__documents_create',
  description: 'Create a new script document',
  inputSchema: {
    type: 'object',
    properties: {
      contents: {
        description: 'Initial script contents',
        type: 'string',
      },
      name: {
        description: 'The name of the document',
        type: 'string',
      },
      language: {
        description: 'The scripting language (AppleScript or JavaScript)',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['language'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.documents.create(args as Parameters<typeof client.documents.create>[0])
  },
}

/**
 * MCP tools for Microsoft-word.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Undo the last action
 */
export const appUndoTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_undo',
  description: 'Undo the last action',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.undo()
    return { success: true }
  },
}

/**
 * Redo the last undone action
 */
export const appRedoTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_redo',
  description: 'Redo the last undone action',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.redo()
    return { success: true }
  },
}

/**
 * Copy the selected content to the clipboard
 */
export const appCopyObjectTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_copy_object',
  description: 'Copy the selected content to the clipboard',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.copyObject()
    return { success: true }
  },
}

/**
 * Cut the selected content to the clipboard
 */
export const appCutObjectTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_cut_object',
  description: 'Cut the selected content to the clipboard',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.cutObject()
    return { success: true }
  },
}

/**
 * Paste content from the clipboard
 */
export const appPasteObjectTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_paste_object',
  description: 'Paste content from the clipboard',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.pasteObject()
    return { success: true }
  },
}

/**
 * Select all content in the document
 */
export const appSelectAllTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_select_all',
  description: 'Select all content in the document',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.selectAll()
    return { success: true }
  },
}

/**
 * Find text in the document
 */
export const appFindTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_find',
  description: 'Find text in the document',
  inputSchema: {
    type: 'object',
    properties: {
      findText: {
        description: 'The text to search for',
        type: 'string',
      },
      matchCase: {
        description: 'Whether to match case',
        type: 'boolean',
      },
      matchWholeWord: {
        description: 'Whether to match whole words only',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['findText'],
  },
  handler: async (args) => {
    const { findText, matchCase, matchWholeWord } = args as {
      findText: string
      matchCase?: boolean
      matchWholeWord?: boolean
    }
    const client = getClient()
    await client.find(
      findText as unknown as Parameters<typeof client.find>[0],
      matchCase as unknown as Parameters<typeof client.find>[1],
      matchWholeWord as unknown as Parameters<typeof client.find>[2]
    )
    return { success: true }
  },
}

/**
 * Replace text in the document
 */
export const appReplaceTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_replace',
  description: 'Replace text in the document',
  inputSchema: {
    type: 'object',
    properties: {
      findText: {
        description: 'The text to search for',
        type: 'string',
      },
      replaceWith: {
        description: 'The replacement text',
        type: 'string',
      },
      replaceAll: {
        description: 'Whether to replace all occurrences',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['findText', 'replaceWith'],
  },
  handler: async (args) => {
    const { findText, replaceWith, replaceAll } = args as {
      findText: string
      replaceWith: string
      replaceAll?: boolean
    }
    const client = getClient()
    await client.replace(
      findText as unknown as Parameters<typeof client.replace>[0],
      replaceWith as unknown as Parameters<typeof client.replace>[1],
      replaceAll as unknown as Parameters<typeof client.replace>[2]
    )
    return { success: true }
  },
}

/**
 * Insert text at the specified location
 */
export const appInsertTextTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_insert_text',
  description: 'Insert text at the specified location',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        description: 'The text to insert',
        type: 'string',
      },
      at: {
        description: 'The character position to insert at',
        type: 'number',
      },
    },
    additionalProperties: false,
    required: ['text'],
  },
  handler: async (args) => {
    const { text, at } = args as { text: string; at?: number }
    const client = getClient()
    await client.insertText(
      text as unknown as Parameters<typeof client.insertText>[0],
      at as unknown as Parameters<typeof client.insertText>[1]
    )
    return { success: true }
  },
}

/**
 * Create a new document
 */
export const appCreateNewDocumentTool: McpToolDefinition = {
  name: 'macts__microsoft-word__app_create_new_document',
  description: 'Create a new document',
  inputSchema: {
    type: 'object',
    properties: {
      attachedTemplate: {
        description: 'Path to template for the new document',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { attachedTemplate } = args as { attachedTemplate?: string }
    const client = getClient()
    await client.createNewDocument(
      attachedTemplate as unknown as Parameters<typeof client.createNewDocument>[0]
    )
    return { success: true }
  },
}

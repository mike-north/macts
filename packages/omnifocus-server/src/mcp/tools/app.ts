/**
 * MCP tools for Omnifocus.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Generate a list of completions given a string
 */
export const appCompleteTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_complete',
  description: 'Generate a list of completions given a string',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        description: 'Text to complete',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['text'],
  },
  handler: async (args) => {
    const { text } = args as { text: string }
    const client = getClient()
    await client.complete(text as unknown)
    return { success: true }
  },
}

/**
 * Mark one or more projects or tasks complete
 */
export const appMarkCompleteTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_mark_complete',
  description: 'Mark one or more projects or tasks complete',
  inputSchema: {
    type: 'object',
    properties: {
      targets: {
        description: 'Objects to mark complete',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['targets'],
  },
  handler: async (args) => {
    const { targets } = args as { targets: string }
    const client = getClient()
    await client.markComplete(targets as unknown)
    return { success: true }
  },
}

/**
 * Mark one or more projects or tasks incomplete
 */
export const appMarkIncompleteTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_mark_incomplete',
  description: 'Mark one or more projects or tasks incomplete',
  inputSchema: {
    type: 'object',
    properties: {
      targets: {
        description: 'Objects to mark incomplete',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['targets'],
  },
  handler: async (args) => {
    const { targets } = args as { targets: string }
    const client = getClient()
    await client.markIncomplete(targets as unknown)
    return { success: true }
  },
}

/**
 * Mark one or more projects or tasks as dropped
 */
export const appMarkDroppedTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_mark_dropped',
  description: 'Mark one or more projects or tasks as dropped',
  inputSchema: {
    type: 'object',
    properties: {
      targets: {
        description: 'Objects to mark dropped',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['targets'],
  },
  handler: async (args) => {
    const { targets } = args as { targets: string }
    const client = getClient()
    await client.markDropped(targets as unknown)
    return { success: true }
  },
}

/**
 * Converts a textual representation of tasks into tasks
 */
export const appParseTasksIntoTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_parse_tasks_into',
  description: 'Converts a textual representation of tasks into tasks',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        description: 'Text to parse',
        type: 'string',
      },
      into: {
        description: 'Target container',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['text', 'into'],
  },
  handler: async (args) => {
    const { text, into } = args as { text: string; into: string }
    const client = getClient()
    await client.parseTasksInto(text as unknown, into as unknown)
    return { success: true }
  },
}

/**
 * Write a backup archive of the document
 */
export const appArchiveTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_archive',
  description: 'Write a backup archive of the document',
  inputSchema: {
    type: 'object',
    properties: {
      in: {
        description: 'The file in which to archive the document',
        type: 'string',
      },
      compression: {
        description: 'Should the archive be written with data compression enabled',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['in'],
  },
  handler: async (args) => {
    const { in: _in, compression } = args as { in: string; compression?: boolean }
    const client = getClient()
    await client.archive(_in as unknown, compression as unknown)
    return { success: true }
  },
}

/**
 * Hides completed tasks and processes any inbox items
 */
export const appCompactTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_compact',
  description: 'Hides completed tasks and processes any inbox items',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.compact()
    return { success: true }
  },
}

/**
 * Synchronizes with the shared OmniFocus sync database
 */
export const appSynchronizeTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_synchronize',
  description: 'Synchronizes with the shared OmniFocus sync database',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.synchronize()
    return { success: true }
  },
}

/**
 * Imports a file into an existing OmniFocus document
 */
export const appImportIntoTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_import_into',
  description: 'Imports a file into an existing OmniFocus document',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        description: 'File to import',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['file'],
  },
  handler: async (args) => {
    const { file } = args as { file: string }
    const client = getClient()
    await client.importInto(file as unknown)
    return { success: true }
  },
}

/**
 * Undo the last command
 */
export const appUndoTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_undo',
  description: 'Undo the last command',
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
 * Redo the last undone command
 */
export const appRedoTool: McpToolDefinition = {
  name: 'macts__omnifocus__app_redo',
  description: 'Redo the last undone command',
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

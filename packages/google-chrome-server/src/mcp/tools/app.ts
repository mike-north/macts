/**
 * MCP tools for Google-chrome.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Save an object.
 */
export const appSaveTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_save',
  description: 'Save an object.',
  inputSchema: {
    type: 'object',
    properties: {
      in: {
        description: 'The file in which to save the object.',
        type: 'string',
      },
      as: {
        description:
          "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'.",
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { in: _in, as } = args as { in?: string; as?: string }
    const client = getClient()
    await client.save(
      _in as unknown as Parameters<typeof client.save>[0],
      as as unknown as Parameters<typeof client.save>[1]
    )
    return { success: true }
  },
}

/**
 * Open a document.
 */
export const appOpenTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_open',
  description: 'Open a document.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.open()
    return { success: true }
  },
}

/**
 * Close a window.
 */
export const appCloseTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_close',
  description: 'Close a window.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.close()
    return { success: true }
  },
}

/**
 * Quit the application.
 */
export const appQuitTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_quit',
  description: 'Quit the application.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.quit()
    return { success: true }
  },
}

/**
 * Return the number of elements of a particular class within an object.
 */
export const appCountTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_count',
  description: 'Return the number of elements of a particular class within an object.',
  inputSchema: {
    type: 'object',
    properties: {
      each: {
        description: 'The class of objects to be counted.',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { each } = args as { each?: string }
    const client = getClient()
    await client.count(each as unknown as Parameters<typeof client.count>[0])
    return { success: true }
  },
}

/**
 * Delete an object.
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_delete',
  description: 'Delete an object.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client._delete()
    return { success: true }
  },
}

/**
 * Copy object(s) and put the copies at a new location.
 */
export const appDuplicateTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_duplicate',
  description: 'Copy object(s) and put the copies at a new location.',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'The location for the new object(s).',
        type: 'string',
      },
      withProperties: {
        description: 'Properties to be set in the new duplicated object(s).',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { to, withProperties } = args as { to?: string; withProperties?: string }
    const client = getClient()
    await client.duplicate(
      to as unknown as Parameters<typeof client.duplicate>[0],
      withProperties as unknown as Parameters<typeof client.duplicate>[1]
    )
    return { success: true }
  },
}

/**
 * Verify if an object exists.
 */
export const appExistsTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_exists',
  description: 'Verify if an object exists.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.exists()
    return { success: true }
  },
}

/**
 * Make a new object.
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_make',
  description: 'Make a new object.',
  inputSchema: {
    type: 'object',
    properties: {
      new: {
        description: 'The class of the new object.',
        type: 'string',
      },
      at: {
        description: 'The location at which to insert the object.',
        type: 'string',
      },
      withData: {
        description: 'The initial contents of the object.',
        type: 'string',
      },
      withProperties: {
        description: 'The initial values for properties of the object.',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['new'],
  },
  handler: async (args) => {
    const {
      new: _new,
      at,
      withData,
      withProperties,
    } = args as { new: string; at?: string; withData?: string; withProperties?: string }
    const client = getClient()
    await client.make(
      _new as unknown as Parameters<typeof client.make>[0],
      at as unknown as Parameters<typeof client.make>[1],
      withData as unknown as Parameters<typeof client.make>[2],
      withProperties as unknown as Parameters<typeof client.make>[3]
    )
    return { success: true }
  },
}

/**
 * Move object(s) to a new location.
 */
export const appMoveTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_move',
  description: 'Move object(s) to a new location.',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'The new location for the object(s).',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client.move(to as unknown as Parameters<typeof client.move>[0])
    return { success: true }
  },
}

/**
 * Print an object.
 */
export const appPrintTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_print',
  description: 'Print an object.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.print()
    return { success: true }
  },
}

/**
 * Reload a tab.
 */
export const appReloadTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_reload',
  description: 'Reload a tab.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.reload()
    return { success: true }
  },
}

/**
 * Go Back (If Possible).
 */
export const appGoBackTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_go_back',
  description: 'Go Back (If Possible).',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.goBack()
    return { success: true }
  },
}

/**
 * Go Forward (If Possible).
 */
export const appGoForwardTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_go_forward',
  description: 'Go Forward (If Possible).',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.goForward()
    return { success: true }
  },
}

/**
 * Select all.
 */
export const appSelectAllTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_select_all',
  description: 'Select all.',
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
 * Cut selected text (If Possible).
 */
export const appCutSelectionTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_cut_selection',
  description: 'Cut selected text (If Possible).',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.cutSelection()
    return { success: true }
  },
}

/**
 * Copy text.
 */
export const appCopySelectionTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_copy_selection',
  description: 'Copy text.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.copySelection()
    return { success: true }
  },
}

/**
 * Paste text (If Possible).
 */
export const appPasteSelectionTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_paste_selection',
  description: 'Paste text (If Possible).',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.pasteSelection()
    return { success: true }
  },
}

/**
 * Undo the last change.
 */
export const appUndoTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_undo',
  description: 'Undo the last change.',
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
 * Redo the last change.
 */
export const appRedoTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_redo',
  description: 'Redo the last change.',
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
 * Stop the current tab from loading.
 */
export const appStopTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_stop',
  description: 'Stop the current tab from loading.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.stop()
    return { success: true }
  },
}

/**
 * View the HTML source of the tab.
 */
export const appViewSourceTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_view_source',
  description: 'View the HTML source of the tab.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.viewSource()
    return { success: true }
  },
}

/**
 * Execute a piece of javascript.
 */
export const appExecuteTool: McpToolDefinition = {
  name: 'macts__google-chrome__app_execute',
  description: 'Execute a piece of javascript.',
  inputSchema: {
    type: 'object',
    properties: {
      javascript: {
        description: 'The javascript code to execute.',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['javascript'],
  },
  handler: async (args) => {
    const { javascript } = args as { javascript: string }
    const client = getClient()
    await client.execute(javascript as unknown as Parameters<typeof client.execute>[0])
    return { success: true }
  },
}

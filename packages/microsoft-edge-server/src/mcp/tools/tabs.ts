/**
 * MCP tools for Microsoft-edge.app tabs operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all tabs in a window
 */
export const tabsListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_list',
  description: 'List all tabs in a window',
  inputSchema: {
    type: 'object',
    properties: {
      windowId: {
        description: 'Window identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['windowId'],
  },
  handler: async (args) => {
    const { windowId } = args as { windowId: string }
    void windowId
    const client = getClient()
    return client.tabs.list()
  },
}

/**
 * Get a tab by ID
 */
export const tabsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_get',
  description: 'Get a tab by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.tabs.get(id as unknown as Parameters<typeof client.tabs.get>[0])
  },
}

/**
 * Create a new tab
 */
export const tabsCreateTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_create',
  description: 'Create a new tab',
  inputSchema: {
    type: 'object',
    properties: {
      windowId: {
        description: 'Window identifier for the tab',
        type: 'string',
      },
      uRL: {
        description: 'URL to load in the tab',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['windowId'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.tabs.create(args as Parameters<typeof client.tabs.create>[0])
  },
}

/**
 * Reload a tab
 */
export const tabsReloadTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_reload',
  description: 'Reload a tab',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.reload(tabId as unknown as Parameters<typeof client.tabs.reload>[0])
    return { success: true }
  },
}

/**
 * Go Back (If Possible)
 */
export const tabsGoBackTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_go_back',
  description: 'Go Back (If Possible)',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.goBack(tabId as unknown as Parameters<typeof client.tabs.goBack>[0])
    return { success: true }
  },
}

/**
 * Go Forward (If Possible)
 */
export const tabsGoForwardTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_go_forward',
  description: 'Go Forward (If Possible)',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.goForward(tabId as unknown as Parameters<typeof client.tabs.goForward>[0])
    return { success: true }
  },
}

/**
 * Select all
 */
export const tabsSelectAllTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_select_all',
  description: 'Select all',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.selectAll(tabId as unknown as Parameters<typeof client.tabs.selectAll>[0])
    return { success: true }
  },
}

/**
 * Cut selected text (If Possible)
 */
export const tabsCutSelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_cut_selection',
  description: 'Cut selected text (If Possible)',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.cutSelection(
      tabId as unknown as Parameters<typeof client.tabs.cutSelection>[0]
    )
    return { success: true }
  },
}

/**
 * Copy text
 */
export const tabsCopySelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_copy_selection',
  description: 'Copy text',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.copySelection(
      tabId as unknown as Parameters<typeof client.tabs.copySelection>[0]
    )
    return { success: true }
  },
}

/**
 * Paste text (If Possible)
 */
export const tabsPasteSelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_paste_selection',
  description: 'Paste text (If Possible)',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.pasteSelection(
      tabId as unknown as Parameters<typeof client.tabs.pasteSelection>[0]
    )
    return { success: true }
  },
}

/**
 * Undo the last change
 */
export const tabsUndoTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_undo',
  description: 'Undo the last change',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.undo(tabId as unknown as Parameters<typeof client.tabs.undo>[0])
    return { success: true }
  },
}

/**
 * Redo the last change
 */
export const tabsRedoTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_redo',
  description: 'Redo the last change',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.redo(tabId as unknown as Parameters<typeof client.tabs.redo>[0])
    return { success: true }
  },
}

/**
 * Stop the current tab from loading
 */
export const tabsStopTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_stop',
  description: 'Stop the current tab from loading',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.stop(tabId as unknown as Parameters<typeof client.tabs.stop>[0])
    return { success: true }
  },
}

/**
 * View the HTML source of the tab
 */
export const tabsViewSourceTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_view_source',
  description: 'View the HTML source of the tab',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId'],
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string }
    const client = getClient()
    await client.tabs.viewSource(tabId as unknown as Parameters<typeof client.tabs.viewSource>[0])
    return { success: true }
  },
}

/**
 * Execute a piece of javascript
 */
export const tabsExecuteTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_execute',
  description: 'Execute a piece of javascript',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        description: 'Tab identifier',
        type: 'string',
      },
      javascript: {
        description: 'The javascript code to execute',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['tabId', 'javascript'],
  },
  handler: async (args) => {
    const { tabId, javascript } = args as { tabId: string; javascript: string }
    const client = getClient()
    await client.tabs.execute(
      tabId as unknown as Parameters<typeof client.tabs.execute>[0],
      javascript as unknown as Parameters<typeof client.tabs.execute>[1]
    )
    return { success: true }
  },
}

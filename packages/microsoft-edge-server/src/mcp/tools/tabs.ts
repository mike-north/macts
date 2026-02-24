/**
 * MCP tools for Microsoft-edge.app tabs operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all tabs in a window
 */
export const tabsListTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_list',
  description: 'List all tabs in a window',
  inputSchema: {
    "type": "object",
    "properties": {
      "windowId": {
        "description": "Window identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "windowId"
    ]
  },
  handler: async (args) => {
    const { windowId } = args as { windowId: string };
    void windowId;
    const client = getClient();
    return client.tabs.list();
  },
};

/**
 * Get a tab by ID
 */
export const tabsGetTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_get',
  description: 'Get a tab by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "id"
    ]
  },
  handler: async (args) => {
    const { id } = args as { id: string };
    const client = getClient();
    return client.tabs.get(id);
  },
};

/**
 * Create a new tab
 */
export const tabsCreateTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_create',
  description: 'Create a new tab',
  inputSchema: {
    "type": "object",
    "properties": {
      "windowId": {
        "description": "Window identifier for the tab",
        "type": "string"
      },
      "uRL": {
        "description": "URL to load in the tab",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "windowId"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.tabs.create(args as Record<string, unknown>);
  },
};

/**
 * Reload a tab
 */
export const tabsReloadTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_reload',
  description: 'Reload a tab',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.reload(tabId);
    return { success: true };
  },
};

/**
 * Go Back (If Possible)
 */
export const tabsGoBackTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_go_back',
  description: 'Go Back (If Possible)',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.goBack(tabId);
    return { success: true };
  },
};

/**
 * Go Forward (If Possible)
 */
export const tabsGoForwardTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_go_forward',
  description: 'Go Forward (If Possible)',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.goForward(tabId);
    return { success: true };
  },
};

/**
 * Select all
 */
export const tabsSelectAllTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_select_all',
  description: 'Select all',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.selectAll(tabId);
    return { success: true };
  },
};

/**
 * Cut selected text (If Possible)
 */
export const tabsCutSelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_cut_selection',
  description: 'Cut selected text (If Possible)',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.cutSelection(tabId);
    return { success: true };
  },
};

/**
 * Copy text
 */
export const tabsCopySelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_copy_selection',
  description: 'Copy text',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.copySelection(tabId);
    return { success: true };
  },
};

/**
 * Paste text (If Possible)
 */
export const tabsPasteSelectionTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_paste_selection',
  description: 'Paste text (If Possible)',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.pasteSelection(tabId);
    return { success: true };
  },
};

/**
 * Undo the last change
 */
export const tabsUndoTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_undo',
  description: 'Undo the last change',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.undo(tabId);
    return { success: true };
  },
};

/**
 * Redo the last change
 */
export const tabsRedoTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_redo',
  description: 'Redo the last change',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.redo(tabId);
    return { success: true };
  },
};

/**
 * Stop the current tab from loading
 */
export const tabsStopTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_stop',
  description: 'Stop the current tab from loading',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.stop(tabId);
    return { success: true };
  },
};

/**
 * View the HTML source of the tab
 */
export const tabsViewSourceTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_view_source',
  description: 'View the HTML source of the tab',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string };
    const client = getClient();
    await client.tabs.viewSource(tabId);
    return { success: true };
  },
};

/**
 * Execute a piece of javascript
 */
export const tabsExecuteTool: McpToolDefinition = {
  name: 'macts__microsoft-edge__tabs_execute',
  description: 'Execute a piece of javascript',
  inputSchema: {
    "type": "object",
    "properties": {
      "tabId": {
        "description": "Tab identifier",
        "type": "string"
      },
      "javascript": {
        "description": "The javascript code to execute",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "tabId",
      "javascript"
    ]
  },
  handler: async (args) => {
    const { tabId } = args as { tabId: string; javascript: string };
    const client = getClient();
    await client.tabs.execute(tabId);
    return { success: true };
  },
};


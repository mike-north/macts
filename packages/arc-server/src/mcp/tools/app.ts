/**
 * MCP tools for Arc.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Make a new object.
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__arc__app_make',
  description: 'Make a new object.',
  inputSchema: {
    "type": "object",
    "properties": {
      "new": {
        "description": "The class of the new object.",
        "type": "string"
      },
      "withProperties": {
        "description": "The initial values for properties of the object.",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "new"
    ]
  },
  handler: async (args) => {
    const { new: _new, withProperties } = args as { new: string; withProperties?: string };
    const client = getClient();
    await client.make(_new as unknown, withProperties as unknown);
    return { success: true };
  },
};

/**
 * Return the number of elements of a particular class within an object.
 */
export const appCountTool: McpToolDefinition = {
  name: 'macts__arc__app_count',
  description: 'Return the number of elements of a particular class within an object.',
  inputSchema: {
    "type": "object",
    "properties": {
      "each": {
        "description": "The class of objects to be counted.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { each } = args as { each?: string };
    const client = getClient();
    await client.count(each as unknown);
    return { success: true };
  },
};

/**
 * Close
 */
export const appCloseTool: McpToolDefinition = {
  name: 'macts__arc__app_close',
  description: 'Close',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.close();
    return { success: true };
  },
};

/**
 * Select the tab.
 */
export const appSelectTool: McpToolDefinition = {
  name: 'macts__arc__app_select',
  description: 'Select the tab.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.select();
    return { success: true };
  },
};

/**
 * Go Back (If Possible).
 */
export const appGoBackTool: McpToolDefinition = {
  name: 'macts__arc__app_go_back',
  description: 'Go Back (If Possible).',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.goBack();
    return { success: true };
  },
};

/**
 * Go Forward (If Possible).
 */
export const appGoForwardTool: McpToolDefinition = {
  name: 'macts__arc__app_go_forward',
  description: 'Go Forward (If Possible).',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.goForward();
    return { success: true };
  },
};

/**
 * Reload a tab.
 */
export const appReloadTool: McpToolDefinition = {
  name: 'macts__arc__app_reload',
  description: 'Reload a tab.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.reload();
    return { success: true };
  },
};

/**
 * Stop the current tab from loading.
 */
export const appStopTool: McpToolDefinition = {
  name: 'macts__arc__app_stop',
  description: 'Stop the current tab from loading.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.stop();
    return { success: true };
  },
};

/**
 * Execute a piece of javascript.
 */
export const appExecuteTool: McpToolDefinition = {
  name: 'macts__arc__app_execute',
  description: 'Execute a piece of javascript.',
  inputSchema: {
    "type": "object",
    "properties": {
      "javascript": {
        "description": "The javascript code to execute.",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "javascript"
    ]
  },
  handler: async (args) => {
    const { javascript } = args as { javascript: string };
    const client = getClient();
    await client.execute(javascript as unknown);
    return { success: true };
  },
};

/**
 * Focus on a space.
 */
export const appFocusTool: McpToolDefinition = {
  name: 'macts__arc__app_focus',
  description: 'Focus on a space.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.focus();
    return { success: true };
  },
};


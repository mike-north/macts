/**
 * MCP tools for System-events.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Discard the results of a bounded update session with one or more files.
 */
export const appAbortTransactionTool: McpToolDefinition = {
  name: 'macts__system-events__app_abort_transaction',
  description: 'Discard the results of a bounded update session with one or more files.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.abortTransaction();
    return { success: true };
  },
};

/**
 * Begin a bounded update session with one or more files.
 */
export const appBeginTransactionTool: McpToolDefinition = {
  name: 'macts__system-events__app_begin_transaction',
  description: 'Begin a bounded update session with one or more files.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.beginTransaction();
    return { success: true };
  },
};

/**
 * Apply the results of a bounded update session with one or more files.
 */
export const appEndTransactionTool: McpToolDefinition = {
  name: 'macts__system-events__app_end_transaction',
  description: 'Apply the results of a bounded update session with one or more files.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.endTransaction();
    return { success: true };
  },
};

/**
 * connect a configuration or service
 */
export const appConnectTool: McpToolDefinition = {
  name: 'macts__system-events__app_connect',
  description: 'connect a configuration or service',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.connect();
    return { success: true };
  },
};

/**
 * disconnect a configuration or service
 */
export const appDisconnectTool: McpToolDefinition = {
  name: 'macts__system-events__app_disconnect',
  description: 'disconnect a configuration or service',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.disconnect();
    return { success: true };
  },
};

/**
 * start the screen saver
 */
export const appStartTool: McpToolDefinition = {
  name: 'macts__system-events__app_start',
  description: 'start the screen saver',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.start();
    return { success: true };
  },
};

/**
 * stop the screen saver
 */
export const appStopTool: McpToolDefinition = {
  name: 'macts__system-events__app_stop',
  description: 'stop the screen saver',
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
 * Move disk item(s) to a new location.
 */
export const appMoveTool: McpToolDefinition = {
  name: 'macts__system-events__app_move',
  description: 'Move disk item(s) to a new location.',
  inputSchema: {
    "type": "object",
    "properties": {
      "to": {
        "description": "The new location for the disk item(s).",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "to"
    ]
  },
  handler: async (args) => {
    const { to } = args as { to: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.move(to as any);
    return { success: true };
  },
};

/**
 * Open disk item(s) with the appropriate application.
 */
export const appOpenTool: McpToolDefinition = {
  name: 'macts__system-events__app_open',
  description: 'Open disk item(s) with the appropriate application.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.open();
    return { success: true };
  },
};

/**
 * Log out the current user
 */
export const appLogOutTool: McpToolDefinition = {
  name: 'macts__system-events__app_log_out',
  description: 'Log out the current user',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.logOut();
    return { success: true };
  },
};

/**
 * Restart the computer
 */
export const appRestartTool: McpToolDefinition = {
  name: 'macts__system-events__app_restart',
  description: 'Restart the computer',
  inputSchema: {
    "type": "object",
    "properties": {
      "stateSavingPreference": {
        "description": "Is the user defined state saving preference followed?",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { stateSavingPreference } = args as { stateSavingPreference?: boolean };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.restart(stateSavingPreference as any);
    return { success: true };
  },
};

/**
 * Shut Down the computer
 */
export const appShutDownTool: McpToolDefinition = {
  name: 'macts__system-events__app_shut_down',
  description: 'Shut Down the computer',
  inputSchema: {
    "type": "object",
    "properties": {
      "stateSavingPreference": {
        "description": "Is the user defined state saving preference followed?",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { stateSavingPreference } = args as { stateSavingPreference?: boolean };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.shutDown(stateSavingPreference as any);
    return { success: true };
  },
};

/**
 * Put the computer to sleep
 */
export const appSleepTool: McpToolDefinition = {
  name: 'macts__system-events__app_sleep',
  description: 'Put the computer to sleep',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.sleep();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if key codes were entered
 */
export const appKeyCodeTool: McpToolDefinition = {
  name: 'macts__system-events__app_key_code',
  description: 'cause the target process to behave as if key codes were entered',
  inputSchema: {
    "type": "object",
    "properties": {
      "using": {
        "description": "modifiers with which the key codes are to be entered",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { using } = args as { using?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.keyCode(using as any);
    return { success: true };
  },
};

/**
 * cause the target process to behave as if keystrokes were entered
 */
export const appKeystrokeTool: McpToolDefinition = {
  name: 'macts__system-events__app_keystroke',
  description: 'cause the target process to behave as if keystrokes were entered',
  inputSchema: {
    "type": "object",
    "properties": {
      "using": {
        "description": "modifiers with which the keystrokes are to be entered",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { using } = args as { using?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.keystroke(using as any);
    return { success: true };
  },
};

/**
 * Attach an action to a folder
 */
export const appAttachActionToTool: McpToolDefinition = {
  name: 'macts__system-events__app_attach_action_to',
  description: 'Attach an action to a folder',
  inputSchema: {
    "type": "object",
    "properties": {
      "using": {
        "description": "a file containing the script to attach",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "using"
    ]
  },
  handler: async (args) => {
    const { using } = args as { using: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.attachActionTo(using as any);
    return { success: true };
  },
};

/**
 * List the actions attached to a folder
 */
export const appAttachedScriptsTool: McpToolDefinition = {
  name: 'macts__system-events__app_attached_scripts',
  description: 'List the actions attached to a folder',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.attachedScripts();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if the UI element were cancelled
 */
export const appCancelTool: McpToolDefinition = {
  name: 'macts__system-events__app_cancel',
  description: 'cause the target process to behave as if the UI element were cancelled',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.cancel();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if the UI element were confirmed
 */
export const appConfirmTool: McpToolDefinition = {
  name: 'macts__system-events__app_confirm',
  description: 'cause the target process to behave as if the UI element were confirmed',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.confirm();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if the UI element were decremented
 */
export const appDecrementTool: McpToolDefinition = {
  name: 'macts__system-events__app_decrement',
  description: 'cause the target process to behave as if the UI element were decremented',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.decrement();
    return { success: true };
  },
};

/**
 * Send a folder action code to a folder action script
 */
export const appDoFolderActionTool: McpToolDefinition = {
  name: 'macts__system-events__app_do_folder_action',
  description: 'Send a folder action code to a folder action script',
  inputSchema: {
    "type": "object",
    "properties": {
      "folderActionCode": {
        "description": "the folder action message to process",
        "type": "string"
      },
      "withItemList": {
        "description": "a list of items for the folder action message to process",
        "type": "string"
      },
      "withWindowSize": {
        "description": "the new window size for the folder action message to process",
        "type": "object"
      }
    },
    "additionalProperties": false,
    "required": [
      "folderActionCode"
    ]
  },
  handler: async (args) => {
    const { folderActionCode, withItemList, withWindowSize } = args as { folderActionCode: string; withItemList?: string; withWindowSize?: Record<string, unknown> };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.doFolderAction(folderActionCode as any, withItemList as any, withWindowSize as any);
    return { success: true };
  },
};

/**
 * Edit an action of a folder
 */
export const appEditActionOfTool: McpToolDefinition = {
  name: 'macts__system-events__app_edit_action_of',
  description: 'Edit an action of a folder',
  inputSchema: {
    "type": "object",
    "properties": {
      "usingActionName": {
        "description": "...or the name of the action to edit",
        "type": "string"
      },
      "usingActionNumber": {
        "description": "the index number of the action to edit...",
        "type": "number"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { usingActionName, usingActionNumber } = args as { usingActionName?: string; usingActionNumber?: number };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.editActionOf(usingActionName as any, usingActionNumber as any);
    return { success: true };
  },
};

/**
 * cause the target process to behave as if the UI element were incremented
 */
export const appIncrementTool: McpToolDefinition = {
  name: 'macts__system-events__app_increment',
  description: 'cause the target process to behave as if the UI element were incremented',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.increment();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if keys were held down
 */
export const appKeyDownTool: McpToolDefinition = {
  name: 'macts__system-events__app_key_down',
  description: 'cause the target process to behave as if keys were held down',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.keyDown();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if keys were released
 */
export const appKeyUpTool: McpToolDefinition = {
  name: 'macts__system-events__app_key_up',
  description: 'cause the target process to behave as if keys were released',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.keyUp();
    return { success: true };
  },
};

/**
 * cause the target process to behave as if the UI element were picked
 */
export const appPickTool: McpToolDefinition = {
  name: 'macts__system-events__app_pick',
  description: 'cause the target process to behave as if the UI element were picked',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.pick();
    return { success: true };
  },
};

/**
 * Remove a folder action from a folder
 */
export const appRemoveActionFromTool: McpToolDefinition = {
  name: 'macts__system-events__app_remove_action_from',
  description: 'Remove a folder action from a folder',
  inputSchema: {
    "type": "object",
    "properties": {
      "usingActionName": {
        "description": "...or the name of the action to remove",
        "type": "string"
      },
      "usingActionNumber": {
        "description": "the index number of the action to remove...",
        "type": "number"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { usingActionName, usingActionNumber } = args as { usingActionName?: string; usingActionNumber?: number };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.removeActionFrom(usingActionName as any, usingActionNumber as any);
    return { success: true };
  },
};


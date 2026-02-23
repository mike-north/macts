/**
 * MCP tools for Iterm.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Return the number of elements of a particular class within an object.
 */
export const appCountTool: McpToolDefinition = {
  name: 'macts__iterm__app_count',
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.count(each as any);
    return { success: true };
  },
};

/**
 * Delete an object.
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__iterm__app_delete',
  description: 'Delete an object.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client._delete();
    return { success: true };
  },
};

/**
 * Copy object(s) and put the copies at a new location.
 */
export const appDuplicateTool: McpToolDefinition = {
  name: 'macts__iterm__app_duplicate',
  description: 'Copy object(s) and put the copies at a new location.',
  inputSchema: {
    "type": "object",
    "properties": {
      "to": {
        "description": "The location for the new object(s).",
        "type": "string"
      },
      "withProperties": {
        "description": "Properties to be set in the new duplicated object(s).",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "to"
    ]
  },
  handler: async (args) => {
    const { to, withProperties } = args as { to: string; withProperties?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.duplicate(to as any, withProperties as any);
    return { success: true };
  },
};

/**
 * Verify if an object exists.
 */
export const appExistsTool: McpToolDefinition = {
  name: 'macts__iterm__app_exists',
  description: 'Verify if an object exists.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.exists();
    return { success: true };
  },
};

/**
 * Make a new object.
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__iterm__app_make',
  description: 'Make a new object.',
  inputSchema: {
    "type": "object",
    "properties": {
      "new": {
        "description": "The class of the new object.",
        "type": "string"
      },
      "at": {
        "description": "The location at which to insert the object.",
        "type": "string"
      },
      "withData": {
        "description": "The initial contents of the object.",
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
    const { new: _new, at, withData, withProperties } = args as { new: string; at?: string; withData?: string; withProperties?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.make(_new as any, at as any, withData as any, withProperties as any);
    return { success: true };
  },
};

/**
 * Move object(s) to a new location.
 */
export const appMoveTool: McpToolDefinition = {
  name: 'macts__iterm__app_move',
  description: 'Move object(s) to a new location.',
  inputSchema: {
    "type": "object",
    "properties": {
      "to": {
        "description": "The new location for the object(s).",
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
 * Close a document.
 */
export const appCloseTool: McpToolDefinition = {
  name: 'macts__iterm__app_close',
  description: 'Close a document.',
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
 * Request a Python API cookie
 */
export const appRequestCookieTool: McpToolDefinition = {
  name: 'macts__iterm__app_request_cookie',
  description: 'Request a Python API cookie',
  inputSchema: {
    "type": "object",
    "properties": {
      "andKeyForAppNamed": {
        "description": "Name of script using the cookie. This is shown in the console.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { andKeyForAppNamed } = args as { andKeyForAppNamed?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.requestCookie(andKeyForAppNamed as any);
    return { success: true };
  },
};

/**
 * Create a new tab
 */
export const appCreateTabTool: McpToolDefinition = {
  name: 'macts__iterm__app_create_tab',
  description: 'Create a new tab',
  inputSchema: {
    "type": "object",
    "properties": {
      "withProfile": {
        "description": "The profile name",
        "type": "string"
      },
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "withProfile"
    ]
  },
  handler: async (args) => {
    const { withProfile, command } = args as { withProfile: string; command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.createTab(withProfile as any, command as any);
    return { success: true };
  },
};

/**
 * Create a new tab with the default profile
 */
export const appCreateTabWithDefaultProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_create_tab_with_default_profile',
  description: 'Create a new tab with the default profile',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.createTabWithDefaultProfile(command as any);
    return { success: true };
  },
};

/**
 * Create a new window
 */
export const appCreateWindowWithProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_create_window_with_profile',
  description: 'Create a new window',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.createWindowWithProfile(command as any);
    return { success: true };
  },
};

/**
 * Create a hotkey window
 */
export const appCreateHotkeyWindowWithProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_create_hotkey_window_with_profile',
  description: 'Create a hotkey window',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.createHotkeyWindowWithProfile();
    return { success: true };
  },
};

/**
 * Launch API script by name
 */
export const appLaunchAPIScriptNamedTool: McpToolDefinition = {
  name: 'macts__iterm__app_launch_a_p_i_script_named',
  description: 'Launch API script by name',
  inputSchema: {
    "type": "object",
    "properties": {
      "arguments": {
        "description": "Arguments to pass to script",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { arguments: _arguments } = args as { arguments?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.launchAPIScriptNamed(_arguments as any);
    return { success: true };
  },
};

/**
 * Invokes an expression, such as a registered function.
 */
export const appInvokeAPIExpressionTool: McpToolDefinition = {
  name: 'macts__iterm__app_invoke_a_p_i_expression',
  description: 'Invokes an expression, such as a registered function.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.invokeAPIExpression();
    return { success: true };
  },
};

/**
 * Create a new window with the default profile
 */
export const appCreateWindowWithDefaultProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_create_window_with_default_profile',
  description: 'Create a new window with the default profile',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.createWindowWithDefaultProfile(command as any);
    return { success: true };
  },
};

/**
 * Send text as though it was typed.
 */
export const appWriteTool: McpToolDefinition = {
  name: 'macts__iterm__app_write',
  description: 'Send text as though it was typed.',
  inputSchema: {
    "type": "object",
    "properties": {
      "contentsOfFile": {
        "description": "Filename to send the contents of",
        "type": "string"
      },
      "text": {
        "description": "Text to send",
        "type": "string"
      },
      "newline": {
        "description": "If newline should be added to end of text (default: yes)",
        "type": "boolean"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { contentsOfFile, text, newline } = args as { contentsOfFile?: string; text?: string; newline?: boolean };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.write(contentsOfFile as any, text as any, newline as any);
    return { success: true };
  },
};

/**
 * Make receiver visible and selected.
 */
export const appSelectTool: McpToolDefinition = {
  name: 'macts__iterm__app_select',
  description: 'Make receiver visible and selected.',
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
 * Split a session vertically.
 */
export const appSplitVerticallyTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_vertically',
  description: 'Split a session vertically.',
  inputSchema: {
    "type": "object",
    "properties": {
      "withProfile": {
        "description": "Name of profile for new session.",
        "type": "string"
      },
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "withProfile"
    ]
  },
  handler: async (args) => {
    const { withProfile, command } = args as { withProfile: string; command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitVertically(withProfile as any, command as any);
    return { success: true };
  },
};

/**
 * Split a session vertically, using the default profile for the new session
 */
export const appSplitVerticallyWithDefaultProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_vertically_with_default_profile',
  description: 'Split a session vertically, using the default profile for the new session',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitVerticallyWithDefaultProfile(command as any);
    return { success: true };
  },
};

/**
 * Split a session vertically, using the original session's profile for the new session
 */
export const appSplitVerticallyWithSameProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_vertically_with_same_profile',
  description: 'Split a session vertically, using the original session\'s profile for the new session',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitVerticallyWithSameProfile(command as any);
    return { success: true };
  },
};

/**
 * Split a session horizontally.
 */
export const appSplitHorizontallyTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_horizontally',
  description: 'Split a session horizontally.',
  inputSchema: {
    "type": "object",
    "properties": {
      "withProfile": {
        "description": "Name of profile for new session.",
        "type": "string"
      },
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "withProfile"
    ]
  },
  handler: async (args) => {
    const { withProfile, command } = args as { withProfile: string; command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitHorizontally(withProfile as any, command as any);
    return { success: true };
  },
};

/**
 * Split a session horizontally, using the default profile for the new session
 */
export const appSplitHorizontallyWithDefaultProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_horizontally_with_default_profile',
  description: 'Split a session horizontally, using the default profile for the new session',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitHorizontallyWithDefaultProfile(command as any);
    return { success: true };
  },
};

/**
 * Split a session horizontally, using the original session's profile for the new session
 */
export const appSplitHorizontallyWithSameProfileTool: McpToolDefinition = {
  name: 'macts__iterm__app_split_horizontally_with_same_profile',
  description: 'Split a session horizontally, using the original session\'s profile for the new session',
  inputSchema: {
    "type": "object",
    "properties": {
      "command": {
        "description": "Shell command to run",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { command } = args as { command?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.splitHorizontallyWithSameProfile(command as any);
    return { success: true };
  },
};

/**
 * Returns the value of a session variable with the given name
 */
export const appVariableTool: McpToolDefinition = {
  name: 'macts__iterm__app_variable',
  description: 'Returns the value of a session variable with the given name',
  inputSchema: {
    "type": "object",
    "properties": {
      "named": {
        "description": "Name of variable",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "named"
    ]
  },
  handler: async (args) => {
    const { named } = args as { named: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.variable(named as any);
    return { success: true };
  },
};

/**
 * Sets the value of a session variable
 */
export const appSetVariableTool: McpToolDefinition = {
  name: 'macts__iterm__app_set_variable',
  description: 'Sets the value of a session variable',
  inputSchema: {
    "type": "object",
    "properties": {
      "named": {
        "description": "Name of variable",
        "type": "string"
      },
      "to": {
        "description": "New value",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "named",
      "to"
    ]
  },
  handler: async (args) => {
    const { named, to } = args as { named: string; to: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.setVariable(named as any, to as any);
    return { success: true };
  },
};

/**
 * Reveals a hotkey window. Only to be called on windows that are hotkey windows.
 */
export const appRevealHotkeyWindowTool: McpToolDefinition = {
  name: 'macts__iterm__app_reveal_hotkey_window',
  description: 'Reveals a hotkey window. Only to be called on windows that are hotkey windows.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.revealHotkeyWindow();
    return { success: true };
  },
};

/**
 * Hides a hotkey window. Only to be called on windows that are hotkey windows.
 */
export const appHideHotkeyWindowTool: McpToolDefinition = {
  name: 'macts__iterm__app_hide_hotkey_window',
  description: 'Hides a hotkey window. Only to be called on windows that are hotkey windows.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.hideHotkeyWindow();
    return { success: true };
  },
};

/**
 * Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.
 */
export const appToggleHotkeyWindowTool: McpToolDefinition = {
  name: 'macts__iterm__app_toggle_hotkey_window',
  description: 'Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.toggleHotkeyWindow();
    return { success: true };
  },
};


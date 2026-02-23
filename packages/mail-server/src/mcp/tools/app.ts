/**
 * MCP tools for Mail.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Delete an object.
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__mail__app_delete',
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
 * Copy an object.
 */
export const appDuplicateTool: McpToolDefinition = {
  name: 'macts__mail__app_duplicate',
  description: 'Copy an object.',
  inputSchema: {
    "type": "object",
    "properties": {
      "to": {
        "description": "The location for the new copy or copies.",
        "type": "string"
      },
      "withProperties": {
        "description": "Properties to set in the new copy or copies right away.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { to, withProperties } = args as { to?: string; withProperties?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.duplicate(to as any, withProperties as any);
    return { success: true };
  },
};

/**
 * Move an object to a new location.
 */
export const appMoveTool: McpToolDefinition = {
  name: 'macts__mail__app_move',
  description: 'Move an object to a new location.',
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
 * Triggers a check for email.
 */
export const appCheckForNewMailTool: McpToolDefinition = {
  name: 'macts__mail__app_check_for_new_mail',
  description: 'Triggers a check for email.',
  inputSchema: {
    "type": "object",
    "properties": {
      "for": {
        "description": "Specify the account that you wish to check for mail",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { for: _for } = args as { for?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.checkForNewMail(_for as any);
    return { success: true };
  },
};

/**
 * Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"
 */
export const appExtractNameFromTool: McpToolDefinition = {
  name: 'macts__mail__app_extract_name_from',
  description: 'Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.extractNameFrom();
    return { success: true };
  },
};

/**
 * Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
 */
export const appExtractAddressFromTool: McpToolDefinition = {
  name: 'macts__mail__app_extract_address_from',
  description: 'Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.extractAddressFrom();
    return { success: true };
  },
};

/**
 * Opens a mailto URL.
 */
export const appGetURLTool: McpToolDefinition = {
  name: 'macts__mail__app_get_u_r_l',
  description: 'Opens a mailto URL.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.getURL();
    return { success: true };
  },
};

/**
 * Imports a mailbox created by Mail.
 */
export const appImportMailMailboxTool: McpToolDefinition = {
  name: 'macts__mail__app_import_mail_mailbox',
  description: 'Imports a mailbox created by Mail.',
  inputSchema: {
    "type": "object",
    "properties": {
      "at": {
        "description": "the mailbox or folder of mailboxes to import",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "at"
    ]
  },
  handler: async (args) => {
    const { at } = args as { at: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.importMailMailbox(at as any);
    return { success: true };
  },
};

/**
 * Opens a mailto URL.
 */
export const appMailtoTool: McpToolDefinition = {
  name: 'macts__mail__app_mailto',
  description: 'Opens a mailto URL.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.mailto();
    return { success: true };
  },
};

/**
 * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.
 */
export const appPerformMailActionWithMessagesTool: McpToolDefinition = {
  name: 'macts__mail__app_perform_mail_action_with_messages',
  description: 'Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.',
  inputSchema: {
    "type": "object",
    "properties": {
      "inMailboxes": {
        "description": "If the script is being executed by the user selecting an item in the scripts menu, this argument will specify the mailboxes that are currently selected. Otherwise it will not be specified.",
        "type": "string"
      },
      "forRule": {
        "description": "If the script is being executed by a rule action, this argument will be the rule being invoked. Otherwise it will not be specified.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { inMailboxes, forRule } = args as { inMailboxes?: string; forRule?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.performMailActionWithMessages(inMailboxes as any, forRule as any);
    return { success: true };
  },
};

/**
 * Command to trigger synchronizing of an IMAP account with the server.
 */
export const appSynchronizeTool: McpToolDefinition = {
  name: 'macts__mail__app_synchronize',
  description: 'Command to trigger synchronizing of an IMAP account with the server.',
  inputSchema: {
    "type": "object",
    "properties": {
      "with": {
        "description": "The account to synchronize",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "with"
    ]
  },
  handler: async (args) => {
    const { with: _with } = args as { with: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.synchronize(_with as any);
    return { success: true };
  },
};


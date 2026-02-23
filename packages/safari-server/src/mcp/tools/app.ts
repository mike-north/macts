/**
 * MCP tools for Safari.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.
 */
export const appAddReadingListItemTool: McpToolDefinition = {
  name: 'macts__safari__app_add_reading_list_item',
  description: 'Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.',
  inputSchema: {
    "type": "object",
    "properties": {
      "andPreviewText": {
        "description": "Preview text for the Reading List item, usually the first few sentences of the article",
        "type": "string"
      },
      "withTitle": {
        "description": "Title of the Reading List item",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { andPreviewText, withTitle } = args as { andPreviewText?: string; withTitle?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.addReadingListItem(andPreviewText as any, withTitle as any);
    return { success: true };
  },
};

/**
 * Applies a string of JavaScript code to a document.
 */
export const appDoJavaScriptTool: McpToolDefinition = {
  name: 'macts__safari__app_do_java_script',
  description: 'Applies a string of JavaScript code to a document.',
  inputSchema: {
    "type": "object",
    "properties": {
      "in": {
        "description": "The tab that the JavaScript should be evaluated in.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { in: _in } = args as { in?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.doJavaScript(_in as any);
    return { success: true };
  },
};

/**
 * Emails the contents of a tab.
 */
export const appEmailContentsTool: McpToolDefinition = {
  name: 'macts__safari__app_email_contents',
  description: 'Emails the contents of a tab.',
  inputSchema: {
    "type": "object",
    "properties": {
      "of": {
        "description": "The tab to send.",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const { of: _of } = args as { of?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.emailContents(_of as any);
    return { success: true };
  },
};

/**
 * Searches the web using Safari's current search provider.
 */
export const appSearchTheWebTool: McpToolDefinition = {
  name: 'macts__safari__app_search_the_web',
  description: 'Searches the web using Safari\'s current search provider.',
  inputSchema: {
    "type": "object",
    "properties": {
      "in": {
        "description": "The tab that the search results should shown in.",
        "type": "string"
      },
      "for": {
        "description": "The query to search for.",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "for"
    ]
  },
  handler: async (args) => {
    const { for: _for, in: _in } = args as { for: string; in?: string };
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.searchTheWeb(_for as any, _in as any);
    return { success: true };
  },
};

/**
 * Shows Safari's bookmarks.
 */
export const appShowBookmarksTool: McpToolDefinition = {
  name: 'macts__safari__app_show_bookmarks',
  description: 'Shows Safari\'s bookmarks.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.showBookmarks();
    return { success: true };
  },
};

/**
 * Show Safari Extensions preferences.
 */
export const appShowExtensionsPreferencesTool: McpToolDefinition = {
  name: 'macts__safari__app_show_extensions_preferences',
  description: 'Show Safari Extensions preferences.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.showExtensionsPreferences();
    return { success: true };
  },
};

/**
 * Dispatch a message to a Safari Extension.
 */
export const appDispatchMessageToExtensionTool: McpToolDefinition = {
  name: 'macts__safari__app_dispatch_message_to_extension',
  description: 'Dispatch a message to a Safari Extension.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.dispatchMessageToExtension();
    return { success: true };
  },
};

/**
 * Make sure that all in-memory structures are in-sync with their on-disk counterparts.
 */
export const appSyncAllPlistToDiskTool: McpToolDefinition = {
  name: 'macts__safari__app_sync_all_plist_to_disk',
  description: 'Make sure that all in-memory structures are in-sync with their on-disk counterparts.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.syncAllPlistToDisk();
    return { success: true };
  },
};

/**
 * Show Safari's Privacy Report
 */
export const appShowPrivacyReportTool: McpToolDefinition = {
  name: 'macts__safari__app_show_privacy_report',
  description: 'Show Safari\'s Privacy Report',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.showPrivacyReport();
    return { success: true };
  },
};

/**
 * Show Safari Credit Card Settings.
 */
export const appShowCreditCardSettingsTool: McpToolDefinition = {
  name: 'macts__safari__app_show_credit_card_settings',
  description: 'Show Safari Credit Card Settings.',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    await client.showCreditCardSettings();
    return { success: true };
  },
};


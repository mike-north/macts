/**
 * MCP plugin for Contacts.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Contacts.app automation.
 *
 * Provides tools for managing contacts resources.
 */
export const contactsPlugin: McpPlugin = {
  name: 'contacts',
  description: 'MCP plugin for macOS Contacts.app automation',
  tools: allTools,
};

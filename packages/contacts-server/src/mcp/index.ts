/**
 * MCP plugin for macOS Contacts.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { contactsPlugin as plugin, contactsPlugin } from './plugin.js'
export type { McpPlugin, McpToolDefinition } from '@macts/types'

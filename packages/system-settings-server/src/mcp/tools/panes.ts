/**
 * MCP tools for System-settings.app panes operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Prompt for authorization for a settings pane. Deprecated: no longer does anything.
 */
export const panesAuthorizeTool: McpToolDefinition = {
  name: 'macts__system-settings__panes_authorize',
  description: 'Prompt for authorization for a settings pane. Deprecated: no longer does anything.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.panes.authorize()
    return { success: true }
  },
}

/**
 * Times and loads given settings pane and returns load time. Deprecated: no longer does anything.
 */
export const panesTimedLoadTool: McpToolDefinition = {
  name: 'macts__system-settings__panes_timed_load',
  description:
    'Times and loads given settings pane and returns load time. Deprecated: no longer does anything.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.panes.timedLoad()
    return { success: true }
  },
}

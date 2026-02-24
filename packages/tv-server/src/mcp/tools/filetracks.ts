/**
 * MCP tools for Tv.app filetracks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * update file track information from the current information in the track’s file
 */
export const filetracksRefreshTool: McpToolDefinition = {
  name: 'macts__tv__filetracks_refresh',
  description: 'update file track information from the current information in the track’s file',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.filetracks.refresh()
    return { success: true }
  },
}

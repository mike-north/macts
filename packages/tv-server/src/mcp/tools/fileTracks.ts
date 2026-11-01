/**
 * MCP tools for Tv.app fileTracks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * update file track information from the current information in the track’s file
 */
export const fileTracksRefreshTool: McpToolDefinition = {
  name: 'macts__tv__fileTracks_refresh',
  description: 'update file track information from the current information in the track’s file',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.fileTracks.refresh()
    return { success: true }
  },
}

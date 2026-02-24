/**
 * MCP tools for Music.app playlists operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Move playlist(s) to a new location
 */
export const playlistsMoveTool: McpToolDefinition = {
  name: 'macts__music__playlists_move',
  description: 'Move playlist(s) to a new location',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'the new location for the playlist(s)',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client.playlists.move(to)
    return { success: true }
  },
}

/**
 * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
 */
export const playlistsSearchTool: McpToolDefinition = {
  name: 'macts__music__playlists_search',
  description:
    'search a playlist for tracks matching the search string. Identical to entering search text in the Search field.',
  inputSchema: {
    type: 'object',
    properties: {
      for: {
        description: 'the search text',
        type: 'string',
      },
      only: {
        description: 'area to search (default is all)',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['for'],
  },
  handler: async (args) => {
    const { for: _for } = args as { for: string; only?: string }
    const client = getClient()
    await client.playlists.search(_for)
    return { success: true }
  },
}

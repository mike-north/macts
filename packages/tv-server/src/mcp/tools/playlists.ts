/**
 * MCP tools for Tv.app playlists operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Move playlist(s) to a new location
 */
export const playlistsMoveTool: McpToolDefinition = {
  name: 'macts__tv__playlists_move',
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
    await client.playlists.move(to as unknown as Parameters<typeof client.playlists.move>[0])
    return { success: true }
  },
}

/**
 * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
 */
export const playlistsSearchTool: McpToolDefinition = {
  name: 'macts__tv__playlists_search',
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
    const { for: _for, only } = args as { for: string; only?: string }
    const client = getClient()
    await client.playlists.search(
      _for as unknown as Parameters<typeof client.playlists.search>[0],
      only as unknown as Parameters<typeof client.playlists.search>[1]
    )
    return { success: true }
  },
}

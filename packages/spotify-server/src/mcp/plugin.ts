/**
 * MCP plugin for Spotify.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp'
import { allTools } from './tools/index.js'

/**
 * MCP plugin for macOS Spotify.app automation.
 *
 * Provides tools for managing spotify resources.
 */
export const spotifyPlugin: McpPlugin = {
  name: 'spotify',
  description: 'MCP plugin for macOS Spotify.app automation',
  tools: allTools,
}

/**
 * MCP plugin for TV.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS TV.app automation.
 *
 * Provides tools for managing tv resources.
 */
export const tvPlugin: McpPlugin = {
  name: 'tv',
  description: 'MCP plugin for macOS TV.app automation',
  tools: allTools,
};

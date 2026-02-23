/**
 * MCP plugin for Screen Sharing.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Screen Sharing.app automation.
 *
 * Provides tools for managing screen-sharing resources.
 */
export const screenSharingPlugin: McpPlugin = {
  name: 'screen-sharing',
  description: 'MCP plugin for macOS Screen Sharing.app automation',
  tools: allTools,
};

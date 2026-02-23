/**
 * MCP plugin for Microsoft Edge.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Microsoft Edge.app automation.
 *
 * Provides tools for managing microsoft-edge resources.
 */
export const microsoftEdgePlugin: McpPlugin = {
  name: 'microsoft-edge',
  description: 'MCP plugin for macOS Microsoft Edge.app automation',
  tools: allTools,
};

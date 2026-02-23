/**
 * MCP plugin for Preview.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Preview.app automation.
 *
 * Provides tools for managing preview resources.
 */
export const previewPlugin: McpPlugin = {
  name: 'preview',
  description: 'MCP plugin for macOS Preview.app automation',
  tools: allTools,
};

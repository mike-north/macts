/**
 * MCP plugin for Console.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Console.app automation.
 *
 * Provides tools for managing console resources.
 */
export const consolePlugin: McpPlugin = {
  name: 'console',
  description: 'MCP plugin for macOS Console.app automation',
  tools: allTools,
};

/**
 * MCP plugin for Automator.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Automator.app automation.
 *
 * Provides tools for managing automator resources.
 */
export const automatorPlugin: McpPlugin = {
  name: 'automator',
  description: 'MCP plugin for macOS Automator.app automation',
  tools: allTools,
};

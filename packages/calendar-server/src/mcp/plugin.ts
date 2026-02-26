/**
 * MCP plugin for Calendar.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS Calendar.app automation.
 *
 * Provides tools for managing calendar resources.
 */
export const calendarPlugin: McpPlugin = {
  name: 'calendar',
  description: 'MCP plugin for macOS Calendar.app automation',
  tools: allTools,
};

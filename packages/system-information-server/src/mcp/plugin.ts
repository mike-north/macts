/**
 * MCP plugin for System Information.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS System Information.app automation.
 *
 * Provides tools for managing system-information resources.
 */
export const systemInformationPlugin: McpPlugin = {
  name: 'system-information',
  description: 'MCP plugin for macOS System Information.app automation',
  tools: allTools,
};

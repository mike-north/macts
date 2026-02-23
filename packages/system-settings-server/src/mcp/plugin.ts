/**
 * MCP plugin for System Settings.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS System Settings.app automation.
 *
 * Provides tools for managing system-settings resources.
 */
export const systemSettingsPlugin: McpPlugin = {
  name: 'system-settings',
  description: 'MCP plugin for macOS System Settings.app automation',
  tools: allTools,
};

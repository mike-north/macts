/**
 * MCP plugin for OmniGraffle.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS OmniGraffle.app automation.
 *
 * Provides tools for managing omnigraffle resources.
 */
export const omnigrafflePlugin: McpPlugin = {
  name: 'omnigraffle',
  description: 'MCP plugin for macOS OmniGraffle.app automation',
  tools: allTools,
};

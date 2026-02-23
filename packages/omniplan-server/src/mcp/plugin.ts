/**
 * MCP plugin for OmniPlan.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS OmniPlan.app automation.
 *
 * Provides tools for managing omniplan resources.
 */
export const omniplanPlugin: McpPlugin = {
  name: 'omniplan',
  description: 'MCP plugin for macOS OmniPlan.app automation',
  tools: allTools,
};

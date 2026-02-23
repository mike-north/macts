/**
 * @macts/mcp - MCP server for macts
 * @packageDocumentation
 */

export { VERSION } from '@macts/core'

// Core server
export { createMcpServer } from './server.js'

// Types
export type { McpPlugin, McpToolDefinition, McpServerOptions, JsonSchema } from './types.js'

// Plugin utilities
export {
  discoverMcpPlugins,
  loadMcpPlugin,
  readMcpPluginCache,
  writeMcpPluginCache,
  invalidateMcpPluginCache,
} from './plugin/index.js'

export type { PluginDiscoveryResult, PluginLoadError, CachedPlugin } from './plugin/index.js'

// Daemon server
export { createDaemon, getSocketPath, getPidFile } from './daemon/index.js'
export type { DaemonOptions, DaemonServer } from './daemon/index.js'

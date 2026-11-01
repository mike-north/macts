/**
 * @macts/mcp - macts operations served as Model Context Protocol tools.
 *
 * Every tool call is one `MactsRuntime` invocation, verified, authorized,
 * governed, and validated by the runtime exactly as an HTTP API call is
 * (phases/13 D5). This package owns the MCP side only: deriving tools from
 * registered operations, serving host tools such as capability discovery
 * beside them, wiring both into an MCP SDK server, and the HTTP daemon that
 * carries each request's bearer token to the calls it makes. A host chooses
 * the transport and where each call's credential comes from.
 *
 * @packageDocumentation
 */

export { VERSION } from '@macts/core'

// Tools derived from operation contracts, dispatched through the runtime
export {
  createMcpAdapter,
  attachMcpAdapter,
  withHostTools,
  toolNameFor,
  McpToolCompositionError,
  McpToolDerivationError,
  type McpAdapter,
  type McpAdapterOptions,
  type McpHostTool,
  type McpHostToolsOptions,
  type McpToolInputSchema,
  type McpToolListing,
  type McpCredentialResolver,
  type McpRequestExtra,
} from './adapter/index.js'

// The stdio transport, with the credential configured for the session
export { startStdioServer, type StdioServer, type StdioServerOptions } from './stdio.js'

// Built-in capability-discovery tool
export { createDiscoveryTool, DISCOVERY_TOOL_NAME, type DiscoveryToolOptions } from './discovery.js'

// Daemon server
export { createDaemon, getSocketPath, getPidFile } from './daemon/index.js'
export type { DaemonOptions, DaemonServer } from './daemon/index.js'

/**
 * The MCP adapter: tools derived from operation contracts and dispatched
 * through a `MactsRuntime`.
 *
 * @packageDocumentation
 */

export {
  createMcpAdapter,
  type McpAdapter,
  type McpAdapterOptions,
  type McpToolInputSchema,
  type McpToolListing,
} from './adapter.js'
export { attachMcpAdapter, type McpCredentialResolver, type McpRequestExtra } from './attach.js'
export { McpToolDerivationError } from './errors.js'
export { toolNameFor } from './tool-name.js'

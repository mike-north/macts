/**
 * The MCP adapter: tools derived from operation contracts and dispatched
 * through a `MactsRuntime`, with any host tools served beside them.
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
export { McpToolCompositionError, McpToolDerivationError } from './errors.js'
export { withHostTools, type McpHostTool, type McpHostToolsOptions } from './host-tools.js'
export { toolNameFor } from './tool-name.js'

/**
 * The configuration failures raised while the tools an MCP server serves are
 * assembled: deriving tools from registered operations, and composing host
 * tools beside them.
 *
 * @packageDocumentation
 */

/**
 * An MCP adapter could not derive a tool from a registered operation.
 *
 * @remarks
 * Raised while an adapter is being built, never while a tool call is handled,
 * so it is not one of the canonical structured errors and never reaches an MCP
 * client. Its causes are defects in what was registered: an operation id
 * without the `app.resource.operation` form, an input contract that JSON
 * Schema cannot represent or that does not describe an object, or two
 * operations whose ids derive the same tool name. The message names every
 * operation involved, so the defect can be found without a debugger.
 */
export class McpToolDerivationError extends Error {
  /** Identifies derivation failures in logs and serialized errors. */
  override readonly name = 'McpToolDerivationError'
}

/**
 * Host tools could not be served beside an adapter's operation tools.
 *
 * @remarks
 * Raised by {@link withHostTools} while the served tool set is being
 * composed, never while a call is handled, so it is not one of the canonical
 * structured errors and never reaches an MCP client. Its cause is two tools
 * with the same name: two host tools, or a host tool and an operation tool.
 * Neither may silently shadow the other, because a client would then reach a
 * different tool than the listing describes. The message names the tool.
 */
export class McpToolCompositionError extends Error {
  /** Identifies composition failures in logs and serialized errors. */
  override readonly name = 'McpToolCompositionError'
}

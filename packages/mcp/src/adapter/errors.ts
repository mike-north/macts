/**
 * The configuration failure raised while MCP tools are derived from
 * registered operations.
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

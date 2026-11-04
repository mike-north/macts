/**
 * The MCP adapter: macts operations as MCP tools, as a pure transport over a
 * {@link MactsRuntime}.
 *
 * The adapter turns every operation registered on a runtime into one MCP tool
 * and every tool call into one `runtime.invoke` call. It owns protocol
 * concerns only:
 *
 * - leaving out an operation whose descriptor is marked `unavailable`: one
 *   whose input admits no value, so that it is never offered as a tool;
 * - deriving each tool from its operation descriptor: the name from the
 *   operation id ({@link toolNameFor}), the description from the descriptor,
 *   and the input schema from the input side of the descriptor's wire
 *   contract, which is what a call may send (phases/13 D9);
 * - refusing, when it is built, any operation it cannot serve faithfully: an
 *   input contract JSON Schema cannot represent or that does not describe an
 *   object, or two operations that derive the same tool name;
 * - mapping the outcome of a call onto an MCP tool result: the wire value as
 *   `{ "result": … }`, or a canonical structured error as the
 *   `{ "error": { code, message, details } }` envelope with `isError` set,
 *   exactly as the HTTP adapter sends it (phases/13 D6);
 * - telling an agent how to continue a list: when a list operation's page
 *   says more items remain, one plain-language line follows the result
 *   saying how many items the page holds and that calling again with the same
 *   arguments plus `cursor` reads more. Every list tool gets it from its
 *   operation's page output, never from a per-tool hook;
 * - answering a call to a tool it does not serve with an MCP protocol error.
 *
 * It never verifies a credential, checks a permission, evaluates policy, or
 * validates operation input: the runtime does all of that, identically for
 * every surface (phases/13 D5, D11). File results are already grant-bearing
 * metadata in wire form (phases/13 D8), so the adapter never inlines bytes.
 * It never logs or returns the credential, and never echoes the text of an
 * unexpected failure.
 *
 * @packageDocumentation
 */

import { McpError, ErrorCode, type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
  MactsError,
  isPageValueType,
  toWireErrorEnvelope,
  type AnyMactsError,
  type InvocationContext,
  type OperationId,
  type WireErrorEnvelope,
} from '@macts/contracts'
import {
  getLogger,
  type MactsRuntime,
  type RegisteredOperation,
  type RuntimeLogger,
} from '@macts/runtime'
import { McpToolDerivationError } from './errors.js'
import { errorLogFields, internalErrorResult, logSafely, textResult } from './results.js'
import { toolNameFor } from './tool-name.js'

/**
 * The JSON Schema of a tool's input, as MCP requires it: an object schema.
 *
 * @remarks
 * Derived from the input side of the operation's wire contract with
 * `z.toJSONSchema(input.wire, { target: 'draft-7', io: 'input' })`, so it
 * describes the wire values a call may send and carries every keyword that
 * derivation produces.
 */
export interface McpToolInputSchema {
  /** MCP requires every tool's input to be a JSON object. */
  readonly type: 'object'
  /** Any further JSON Schema keyword the derivation produced. */
  readonly [keyword: string]: unknown
}

/** One tool as an MCP `tools/list` response describes it. */
export interface McpToolListing {
  /** The tool name, derived from the operation id by {@link toolNameFor}. */
  readonly name: string
  /** What the tool does: the operation descriptor's description. */
  readonly description: string
  /** The JSON Schema of the tool's arguments, in wire form. */
  readonly inputSchema: McpToolInputSchema
}

/** Configuration for {@link createMcpAdapter}. */
export interface McpAdapterOptions {
  /**
   * Destination for operator-side diagnostics about failed calls.
   *
   * @defaultValue the process-wide logger from `getLogger()`
   */
  readonly logger?: RuntimeLogger
}

/**
 * The MCP transport for one runtime: the tools it serves, and the handling of
 * one call to any of them.
 *
 * @remarks
 * Independent of any MCP SDK server instance; {@link attachMcpAdapter} wires
 * it into one. Each adapter serves the operations registered on its runtime
 * when it was built.
 */
export interface McpAdapter {
  /**
   * Every tool, for an MCP `tools/list` response, in the runtime's
   * registration order.
   *
   * @remarks
   * Computed once, when the adapter was built; every call returns the same
   * listing.
   */
  listTools(): readonly McpToolListing[]
  /**
   * Handle one MCP `tools/call` as one `runtime.invoke`.
   *
   * @param name - The requested tool name.
   * @param args - The call's arguments, as received. Absent arguments are the
   *   empty input `{}`; anything else is passed to the runtime unchanged, which
   *   validates it.
   * @param context - The caller's credential, and optional cancellation and
   *   correlation; or a function that produces them. A function is called
   *   once, and only when `name` is a served tool, so a host can defer
   *   locating the credential until a call needs it. If it throws, the call
   *   fails exactly as if the runtime had thrown that error.
   * @returns `{ content: [{ type: 'text', text: '{"result":…}' }] }` on
   *   success, followed by a second text block holding a note on reading the
   *   next page when a list's page says more items remain (the first block
   *   always parses as JSON); for any failure, `isError: true` with the text
   *   `{"error":{"code","message","details"}}`. Failures never reject.
   * @throws `McpError` with `ErrorCode.InvalidParams` when `name` is not a tool
   *   this adapter serves. The message is fixed and never echoes the name.
   */
  callTool(
    name: string,
    args: unknown,
    context: InvocationContext | (() => InvocationContext)
  ): Promise<CallToolResult>
}

/**
 * The message of the protocol error for a call to a tool this adapter does not
 * serve. Fixed, so a caller's tool name is never reflected back.
 */
const UNKNOWN_TOOL_MESSAGE = 'No such tool.'

/** The JSON Schema dialect every input schema is derived in. */
const INPUT_SCHEMA_TARGET = 'draft-7'

/** One served tool: its listing and the operation a call to it invokes. */
interface ServedTool {
  readonly listing: McpToolListing
  readonly operation: OperationId
  /** Whether the operation returns a page (`t.page(…)`): every list operation does. */
  readonly pages: boolean
}

/**
 * The note that follows a page's result when more items remain: how many
 * items the page holds, and how to read more. It names the `cursor` argument
 * but repeats no data; the cursor itself is the result's `nextCursor`.
 */
function moreItemsNote(itemCount: number): string {
  const items = itemCount === 1 ? '1 item' : `${String(itemCount)} items`
  return `This page holds ${items}; more remain. Call this tool again with the same arguments plus "cursor" set to the result's nextCursor to read the next page.`
}

/**
 * The tool result of a successful call. Its first text block is always
 * exactly the JSON result document, so a client can parse it as JSON. When
 * the tool returns a page and the page says more items remain, a second,
 * separate text block carries the note on how to read the next page; the
 * note never joins the document.
 */
function successResult(result: unknown, pages: boolean): CallToolResult {
  const success = textResult({ result }, false)
  if (!pages || typeof result !== 'object' || result === null) return success
  const { items, nextCursor } = result as { items?: unknown; nextCursor?: unknown }
  if (typeof nextCursor !== 'string' || !Array.isArray(items)) return success
  return {
    content: [...success.content, { type: 'text', text: moreItemsNote(items.length) }],
  }
}

/**
 * The input schema of an operation's tool, derived once from its wire
 * contract.
 *
 * @remarks
 * The schema renders the input side of `input.wire`: the values its
 * validation accepts, which is what a call may send. The wire schema of a
 * generated contract is a pure validator, so its input and output sides are
 * the same document. The input of an operation registered from a manifest
 * alone is a pipe instead, from the command's declared input into a record of
 * JSON values. Its input side lists the command's parameters, which of them
 * are required, and that no other key is accepted; its output side is only
 * the bare JSON record, which tells a client nothing about the call.
 *
 * @throws {@link McpToolDerivationError} naming the operation when JSON Schema
 *   cannot represent the contract or the result is not an object schema. There
 *   is no fallback schema: a tool that advertises less than its contract would
 *   mislead every caller.
 */
function deriveInputSchema(operation: RegisteredOperation): McpToolInputSchema {
  const { id, input } = operation.descriptor
  let schema: Record<string, unknown>
  try {
    schema = z.toJSONSchema(input.wire, { target: INPUT_SCHEMA_TARGET, io: 'input' })
  } catch (cause) {
    throw new McpToolDerivationError(
      `The input contract of operation "${id}" cannot be represented as JSON Schema`,
      { cause }
    )
  }
  if (schema['type'] !== 'object') {
    throw new McpToolDerivationError(
      `The input contract of operation "${id}" does not describe an object, which MCP requires of tool input`
    )
  }
  return { ...schema, type: 'object' }
}

/**
 * Derive one tool per registered operation that can be called, in
 * registration order. An operation whose descriptor is marked `unavailable`
 * (a required input admits no value) gets no tool: every call to it would
 * fail, so offering it would only mislead an agent. Calling its tool name is
 * an unknown-tool call.
 *
 * @throws {@link McpToolDerivationError} when any operation cannot be served,
 *   including two operations that derive the same tool name (naming both).
 */
function deriveTools(operations: readonly RegisteredOperation[]): Map<string, ServedTool> {
  const tools = new Map<string, ServedTool>()
  for (const operation of operations) {
    if (operation.descriptor.unavailable !== undefined) continue
    const { id, description } = operation.descriptor
    const name = toolNameFor(id)
    const existing = tools.get(name)
    if (existing !== undefined) {
      throw new McpToolDerivationError(
        `Operations "${existing.operation}" and "${id}" both derive the MCP tool name "${name}"`
      )
    }
    tools.set(name, {
      listing: { name, description, inputSchema: deriveInputSchema(operation) },
      operation: id,
      pages: isPageValueType(operation.descriptor.output),
    })
  }
  return tools
}

/** Whether `error` is one of the canonical structured errors. */
function isMactsError(error: unknown): error is AnyMactsError {
  return error instanceof MactsError
}

/** What the adapter needs to turn a failure into a tool result. */
interface FailureContext {
  readonly logger: RuntimeLogger
  readonly operation: OperationId
  readonly correlationId?: string | undefined
}

/**
 * The tool result for any failure: the error's own envelope when it is a
 * canonical wire error whose details encode, otherwise a generic internal
 * failure whose original is logged but never echoed.
 */
function failureResult(error: unknown, context: FailureContext): CallToolResult {
  const { logger, operation, correlationId } = context
  if (!isMactsError(error)) {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), operation, correlationId },
        'Tool call failed unexpectedly'
      )
    })
    return internalErrorResult(correlationId)
  }
  if (error.code === 'TRANSPORT_FAILED') {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), operation, correlationId },
        'A client-only transport failure reached the MCP adapter'
      )
    })
    return internalErrorResult(correlationId)
  }
  if (error.code === 'CANCELLED') {
    // The caller left; not a server failure.
    logSafely(() => {
      logger.info({ operation, correlationId }, 'Tool call cancelled by the caller')
    })
  }

  let envelope: WireErrorEnvelope
  try {
    envelope = toWireErrorEnvelope(error)
  } catch (encodeError) {
    // Details that violate their schema are a producer defect. The details
    // themselves are not logged: they failed the contract that keeps secrets
    // out of them.
    logSafely(() => {
      logger.error(
        { err: errorLogFields(encodeError), code: error.code, operation, correlationId },
        'A structured error could not be encoded for the wire'
      )
    })
    return internalErrorResult(correlationId)
  }
  return textResult(envelope, true)
}

/**
 * Build the MCP transport for a runtime.
 *
 * @remarks
 * Derives one tool per operation registered on the runtime when the adapter is
 * built; operations registered later are not served, and neither is an
 * operation whose descriptor is marked `unavailable`. A call to a tool runs its
 * operation through `runtime.invoke` with the caller's `InvocationContext`,
 * and its outcome becomes the tool result described on
 * {@link McpAdapter.callTool}.
 *
 * @param runtime - The runtime that runs every operation.
 * @param options - The logger for failed calls.
 * @returns The adapter, ready to attach to an MCP server with
 *   {@link attachMcpAdapter}.
 * @throws {@link McpToolDerivationError} when an operation cannot be served as
 *   a tool: its id is malformed, its input contract cannot be represented as
 *   JSON Schema or is not an object schema, or its tool name collides with
 *   another operation's. The message names every operation involved.
 */
export function createMcpAdapter(
  runtime: MactsRuntime,
  options: McpAdapterOptions = {}
): McpAdapter {
  const logger = (): RuntimeLogger => options.logger ?? getLogger()
  const tools = deriveTools(runtime.operations())
  const listings: readonly McpToolListing[] = Object.freeze(
    [...tools.values()].map((tool) => tool.listing)
  )

  return {
    listTools() {
      return listings
    },

    async callTool(name, args, context) {
      const tool = tools.get(name)
      if (tool === undefined) {
        // A protocol mismatch, not an operation outcome: the call never reaches
        // the runtime, and the requested name is not reflected back.
        throw new McpError(ErrorCode.InvalidParams, UNKNOWN_TOOL_MESSAGE)
      }
      const { operation, pages } = tool
      let invocation: InvocationContext | undefined
      try {
        invocation = typeof context === 'function' ? context() : context
        const input = args === undefined ? {} : args
        const result = await runtime.invoke(operation, input, invocation)
        return successResult(result, pages)
      } catch (error) {
        return failureResult(error, {
          logger: logger(),
          operation,
          correlationId: invocation?.correlationId,
        })
      }
    },
  }
}

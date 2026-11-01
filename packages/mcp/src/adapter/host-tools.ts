/**
 * Host tools: MCP tools a host serves beside the operation tools, which are
 * not operations.
 *
 * Every operation tool is one `runtime.invoke`, governed by the caller's
 * credential (phases/13 D5). A host may also serve tools that run no operation
 * at all, such as built-in capability discovery. This module composes such
 * tools with an {@link McpAdapter} into one adapter whose listing holds both,
 * so one MCP server serves them through {@link attachMcpAdapter}. It owns:
 *
 * - refusing, when composed, two tools with the same name, so no tool can
 *   shadow another;
 * - routing a call by name: a host tool runs its handler, and every other name
 *   goes to the operation adapter, which keeps its own handling of tools it
 *   does not serve;
 * - turning a host tool's answer into a tool result, and any failure of it
 *   into the generic `INTERNAL` envelope, logged but never echoed.
 *
 * A host tool never receives the caller's credential: it is not an operation,
 * so nothing it does is authorized by one. Whatever filtering it applies is its
 * own.
 *
 * @packageDocumentation
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { InvocationContext } from '@macts/contracts'
import { getLogger, type RuntimeLogger } from '@macts/runtime'
import type { McpAdapter, McpToolInputSchema, McpToolListing } from './adapter.js'
import { McpToolCompositionError } from './errors.js'
import { errorLogFields, internalErrorResult, logSafely, textResult } from './results.js'

/**
 * A tool a host serves beside the operation tools, which runs no operation.
 *
 * @remarks
 * Its listing is served exactly as declared. A call runs `handler` with the
 * call's arguments, and the JSON document it resolves to becomes the tool
 * result's only text content.
 */
export interface McpHostTool {
  /** The tool name. Must not equal any other served tool's name. */
  readonly name: string
  /** What the tool does, for an MCP `tools/list` response. */
  readonly description: string
  /** The JSON Schema of the tool's arguments. */
  readonly inputSchema: McpToolInputSchema
  /**
   * Answer one call.
   *
   * @param args - The call's arguments, as received; absent arguments are `{}`.
   * @returns The JSON document to return to the caller.
   */
  handler(args: unknown): Promise<unknown>
}

/** Configuration for {@link withHostTools}. */
export interface McpHostToolsOptions {
  /**
   * Destination for operator-side diagnostics about failed host tool calls.
   *
   * @defaultValue the process-wide logger from `getLogger()`
   */
  readonly logger?: RuntimeLogger
}

/**
 * Serve host tools beside an adapter's operation tools.
 *
 * @remarks
 * The listing is every host tool, in the order given, followed by the
 * adapter's tools. A call to a host tool runs its handler and never consults
 * the call's context; a call to any other name is handed to `adapter`
 * unchanged, so an unknown tool is still the protocol error the adapter
 * raises, and an operation tool is still exactly one `runtime.invoke`.
 *
 * @param adapter - The operation tools.
 * @param hostTools - The tools to serve beside them.
 * @param options - The logger for failed host tool calls.
 * @returns An adapter serving both, ready for {@link attachMcpAdapter}.
 * @throws {@link McpToolCompositionError} when two host tools, or a host tool
 *   and an operation tool, have the same name.
 */
export function withHostTools(
  adapter: McpAdapter,
  hostTools: readonly McpHostTool[],
  options: McpHostToolsOptions = {}
): McpAdapter {
  const logger = (): RuntimeLogger => options.logger ?? getLogger()
  const operationTools = adapter.listTools()
  const operationToolNames = new Set(operationTools.map((tool) => tool.name))

  const byName = new Map<string, McpHostTool>()
  for (const tool of hostTools) {
    if (byName.has(tool.name)) {
      throw new McpToolCompositionError(`Two host tools are named "${tool.name}"`)
    }
    if (operationToolNames.has(tool.name)) {
      throw new McpToolCompositionError(
        `The host tool "${tool.name}" has the same name as an operation tool`
      )
    }
    byName.set(tool.name, tool)
  }

  const listings: readonly McpToolListing[] = Object.freeze([
    ...hostTools.map(
      (tool): McpToolListing => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })
    ),
    ...operationTools,
  ])

  return {
    listTools() {
      return listings
    },

    async callTool(
      name: string,
      args: unknown,
      context: InvocationContext | (() => InvocationContext)
    ): Promise<CallToolResult> {
      const tool = byName.get(name)
      if (tool === undefined) {
        return adapter.callTool(name, args, context)
      }
      try {
        const document = await tool.handler(args === undefined ? {} : args)
        return textResult(document, false)
      } catch (error) {
        logSafely(() => {
          logger().error({ err: errorLogFields(error), tool: name }, 'Host tool call failed')
        })
        return internalErrorResult(undefined)
      }
    },
  }
}

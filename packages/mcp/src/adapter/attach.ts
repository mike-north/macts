/**
 * Wiring an {@link McpAdapter} into an MCP SDK server.
 *
 * This module is the only place the adapter meets the MCP SDK's request
 * handling. It registers the `tools/list` and `tools/call` handlers and turns
 * each request's handler context into an `InvocationContext`: the credential
 * comes from a host-supplied resolver, and the request's abort signal becomes
 * the invocation's cancellation signal. Choosing where a credential comes from
 * (a key configured at startup for stdio, a per-request bearer token for HTTP)
 * is the host's decision, not the adapter's.
 *
 * @packageDocumentation
 */

// The low-level `Server` is required: tools are listed with JSON Schemas
// derived from wire contracts and validated by the runtime, not by the SDK's
// high-level `McpServer`, which validates arguments itself.
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type ListToolsResult,
  type ServerNotification,
  type ServerRequest,
} from '@modelcontextprotocol/sdk/types.js'
import type { Credential, InvocationContext } from '@macts/contracts'
import type { McpAdapter } from './adapter.js'

/**
 * The MCP SDK's context for one request a server handles: the request's abort
 * signal, its id, and, over an authenticating transport, the verified access
 * token's `authInfo`.
 */
export type McpRequestExtra = RequestHandlerExtra<ServerRequest, ServerNotification>

/**
 * Produces the credential a tool call is invoked under, from that call's
 * request context.
 *
 * @remarks
 * Called once per `tools/call` request for a served tool, and never for
 * `tools/list` or for a call to an unknown tool. A stdio host returns the
 * credential configured for the session; an HTTP host returns the bearer token
 * the transport attached to `extra.authInfo`. The resolver only locates the
 * credential: the runtime verifies it. A resolver that throws fails the call
 * with the same tool-result mapping as any other failure.
 */
export type McpCredentialResolver = (extra: McpRequestExtra) => Credential

/**
 * Serve an adapter's tools from an MCP SDK server.
 *
 * @remarks
 * Declares the server's `tools` capability and registers the `tools/list` and
 * `tools/call` handlers, replacing any registered before. Must be called
 * before the server connects to a transport, because capabilities cannot
 * change afterwards.
 *
 * Each `tools/call` is invoked with the credential `resolveCredential` returns
 * for that request and with the request's abort signal, so a client's
 * cancellation reaches the runtime and the executor.
 *
 * @param server - The MCP SDK server to serve the tools from.
 * @param adapter - The adapter whose tools are served.
 * @param resolveCredential - Locates each call's credential in its request
 *   context.
 * @throws `Error` from the SDK when the server is already connected.
 */
export function attachMcpAdapter(
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server: Server,
  adapter: McpAdapter,
  resolveCredential: McpCredentialResolver
): void {
  server.registerCapabilities({ tools: {} })

  server.setRequestHandler(
    ListToolsRequestSchema,
    (): ListToolsResult => ({ tools: [...adapter.listTools()] })
  )

  server.setRequestHandler(CallToolRequestSchema, (request, extra): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params
    // The context is produced on demand, so a call to an unknown tool never
    // consults the resolver, and a resolver failure becomes a tool result
    // rather than a protocol error that could echo its text.
    return adapter.callTool(
      name,
      args,
      (): InvocationContext => ({ credential: resolveCredential(extra), signal: extra.signal })
    )
  })
}

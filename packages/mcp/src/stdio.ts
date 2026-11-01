/**
 * Serving an {@link McpAdapter} over the MCP stdio transport.
 *
 * Stdio is the transport an MCP client uses when it starts the server process
 * itself. There is one client per process and no per-request headers, so the
 * credential is the one the process was configured with, presented on every
 * tool call (phases/13 D5). It is still verified by the runtime on every call:
 * the stdio server never treats its own startup as an authentication.
 *
 * @packageDocumentation
 */

import type { Readable, Writable } from 'node:stream'
// The low-level `Server` is required: tools are listed with JSON Schemas
// derived from wire contracts and validated by the runtime, not by the SDK's
// high-level `McpServer`, which validates arguments itself.
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { Credential } from '@macts/contracts'
import { VERSION } from '@macts/core'
import type { McpAdapter } from './adapter/adapter.js'
import { attachMcpAdapter } from './adapter/attach.js'

/** Configuration for {@link startStdioServer}. */
export interface StdioServerOptions {
  /** The tools to serve. */
  readonly adapter: McpAdapter
  /**
   * The credential configured for the session, presented on every tool call.
   * The runtime verifies it on each call, so a key revoked while the session
   * runs is refused on its next call.
   */
  readonly credential: Credential
  /** Server name reported to the client. @defaultValue `macts-mcp` */
  readonly name?: string
  /** Server version reported to the client. @defaultValue this package's version */
  readonly version?: string
  /** The stream requests are read from. @defaultValue `process.stdin` */
  readonly input?: Readable
  /**
   * The stream responses are written to; nothing else may write to it.
   * @defaultValue `process.stdout`
   */
  readonly output?: Writable
}

/** A running stdio MCP server. */
export interface StdioServer {
  /** Stop serving and close the transport. */
  close(): Promise<void>
}

/**
 * Serve an adapter's tools over stdio until the client goes away.
 *
 * @param options - The tools, the session credential, and the streams.
 * @returns The running server, once the transport is listening.
 */
export async function startStdioServer(options: StdioServerOptions): Promise<StdioServer> {
  const { adapter, credential } = options
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const server = new Server(
    { name: options.name ?? 'macts-mcp', version: options.version ?? VERSION },
    { capabilities: {} }
  )
  attachMcpAdapter(server, adapter, () => credential)
  await server.connect(new StdioServerTransport(options.input, options.output))
  return {
    close: () => server.close(),
  }
}

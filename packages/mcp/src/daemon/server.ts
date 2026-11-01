/**
 * HTTP daemon server for MCP.
 *
 * Provides an HTTP server that can listen on a Unix socket or TCP port and
 * serves one {@link McpAdapter}'s tools over two transports:
 *
 * - **Streamable HTTP** (`/mcp`) - the current MCP transport, per the
 *   {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http | spec}.
 * - **Legacy SSE** (`/sse` + `/message`) - the deprecated
 *   {@link https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse | HTTP+SSE}
 *   transport, kept for older clients.
 *
 * The daemon is a transport only. Every tool call is answered by the adapter
 * it is given, which a host builds over a `MactsRuntime`, so each call is
 * verified, authorized, governed, and validated by the runtime (phases/13 D5).
 * What the daemon owns is carrying each request's credential to the calls that
 * request makes:
 *
 * - every route other than `GET /health` requires an `Authorization: Bearer`
 *   API key, verified before any session is created or reached, and refused
 *   with the structured `UNAUTHENTICATED` envelope (see `./auth.ts`);
 * - the verified bearer is attached to the request as the MCP SDK's
 *   `AuthInfo`, which the SDK passes to the handler of every message in that
 *   request, and the tool call's credential is read from there. A call is
 *   therefore governed by the key of the request that carried it, never by
 *   another client's key or by a key held by the daemon.
 *
 * @packageDocumentation
 */

import {
  createServer as createHttpServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { unlinkSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
// Using Server for low-level control over request handlers
// Note: Server is marked as deprecated in favor of McpServer, but we need it
// for low-level request handler registration
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { VERSION } from '@macts/core'
import {
  createBearerCredential,
  createKeyStoreVerifier,
  getLogger,
  type CredentialVerifier,
  type RuntimeLogger,
} from '@macts/runtime'
import type { McpAdapter } from '../adapter/adapter.js'
import { attachMcpAdapter, type McpCredentialResolver } from '../adapter/attach.js'
import { authenticateDaemonRequest } from './auth.js'
import { getSocketPath, getPidFile } from './paths.js'

/**
 * Configuration options for the daemon server.
 */
export interface DaemonOptions {
  /**
   * The tools every session serves.
   *
   * @remarks
   * Built by the host over the runtime that runs every call (with any host
   * tools composed beside the operation tools). The daemon only carries each
   * request's credential to it.
   */
  readonly adapter: McpAdapter

  /**
   * Verifies each request's bearer before any MCP handling.
   *
   * @defaultValue the API-key verifier over the key store under `MACTS_HOME`,
   *   the same verification the runtime applies to each call
   */
  readonly verifier?: CredentialVerifier

  /**
   * Destination for operator-side diagnostics about failed requests.
   *
   * @defaultValue the process-wide logger from `getLogger()`
   */
  readonly logger?: RuntimeLogger

  /** Optional TCP port to listen on (in addition to Unix socket) */
  readonly port?: number

  /** Optional Unix socket path (defaults to ~/.macts/mcp.sock) */
  readonly socketPath?: string

  /** Server name for MCP protocol */
  readonly name?: string

  /** Server version for MCP protocol */
  readonly version?: string
}

/**
 * Interface for managing the daemon server lifecycle.
 */
export interface DaemonServer {
  /**
   * Start the daemon server.
   *
   * This will:
   * - Create the Unix socket (removing existing one if present)
   * - Optionally start TCP listener on specified port
   * - Write PID file
   * - Set up signal handlers for graceful shutdown
   *
   * @throws If server fails to start or port/socket is in use
   */
  start(): Promise<void>

  /**
   * Stop the daemon server.
   *
   * This will:
   * - Close all active connections
   * - Clean up Unix socket
   * - Remove PID file
   * - Shut down HTTP server
   */
  stop(): Promise<void>

  /**
   * Check if the daemon is currently running.
   *
   * @returns true if the server is accepting connections
   */
  isRunning(): boolean

  /**
   * Get the underlying HTTP server instance.
   *
   * This is exposed for testing purposes only.
   * @internal
   */
  readonly httpServer: HttpServer | null
}

/**
 * A request whose bearer verified, carrying it as the MCP SDK's `AuthInfo`,
 * where the SDK's transports look for it.
 */
type AuthenticatedRequest = IncomingMessage & { auth: AuthInfo }

/**
 * Read and JSON-parse the full body of an incoming HTTP request.
 *
 * Used only for the `/mcp` POST path, where we must inspect the body
 * (to detect an `initialize` request) before a
 * {@link StreamableHTTPServerTransport} exists to hand it to.
 *
 * @returns The parsed JSON body, or `undefined` if the body is empty
 * @throws Error if the body is not valid JSON
 */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (raw.length === 0) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Write a JSON-RPC 2.0 error response.
 *
 * Used for `/mcp` and `/message` failures that occur before a transport can
 * take over the response (unknown session, malformed initialize request),
 * matching the shape the MCP SDK's own examples use for these cases.
 */
function sendJsonRpcError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }))
}

/**
 * Create a new daemon server instance.
 *
 * The server serves the adapter's tools over HTTP, allowing multiple clients
 * to connect via either the Streamable HTTP transport (`/mcp`) or the legacy
 * SSE transport (`/sse` + `/message`). Each client's tool calls run under the
 * bearer token of the request that carried them.
 *
 * @param options - Daemon configuration
 * @returns DaemonServer instance for lifecycle management
 *
 * @example
 * ```typescript
 * const runtime = createRuntime({ executor, governance: loadHostGovernance });
 * // ...register apps on the runtime...
 * const daemon = createDaemon({
 *   adapter: createMcpAdapter(runtime),
 *   port: 3000,
 * });
 *
 * await daemon.start();
 * // Server now listening on unix socket and port 3000
 *
 * // Later...
 * await daemon.stop();
 * ```
 */
export function createDaemon(options: DaemonOptions): DaemonServer {
  const socketPath = options.socketPath ?? getSocketPath()
  const pidFile = getPidFile()

  let httpServer: HttpServer | null = null
  let running = false

  // Active MCP server instances (one per connection)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const activeServers = new Set<Server>()

  // Streamable HTTP transports, keyed by MCP session ID.
  const streamableTransports = new Map<string, StreamableHTTPServerTransport>()

  // Legacy SSE transports, keyed by MCP session ID.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const sseTransports = new Map<string, SSEServerTransport>()

  const verifier = options.verifier ?? createKeyStoreVerifier()
  const logger = (): RuntimeLogger => options.logger ?? getLogger()

  /**
   * Each tool call's credential: the bearer the transport attached to the
   * request that carried the call, or an empty credential (which the runtime
   * reports as missing) when there is none.
   */
  const resolveCredential: McpCredentialResolver = (extra) =>
    createBearerCredential(extra.authInfo?.token ?? '')

  /**
   * Create an MCP server instance for a single client session, serving the
   * adapter's tools.
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  function createServerInstance(): Server {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const server = new Server(
      {
        name: options.name ?? 'macts-mcp-daemon',
        version: options.version ?? VERSION,
      },
      { capabilities: {} }
    )
    attachMcpAdapter(server, options.adapter, resolveCredential)
    activeServers.add(server)
    return server
  }

  /**
   * Handle a request against the Streamable HTTP transport (`/mcp`).
   *
   * Routes by the `Mcp-Session-Id` header when present. A request with no
   * session ID must be a POST `initialize` request, which creates a new
   * transport and registers it in {@link streamableTransports} once the SDK
   * confirms the session (via `onsessioninitialized`).
   */
  async function handleStreamableHttpRequest(
    req: AuthenticatedRequest,
    res: ServerResponse
  ): Promise<void> {
    const sessionIdHeader = req.headers['mcp-session-id']
    const sessionId = typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined

    if (sessionId) {
      const transport = streamableTransports.get(sessionId)
      if (!transport) {
        sendJsonRpcError(res, 404, 'Session not found')
        return
      }
      await transport.handleRequest(req, res)
      return
    }

    if (req.method !== 'POST') {
      sendJsonRpcError(res, 400, 'Bad Request: Mcp-Session-Id header is required')
      return
    }

    let body: unknown
    try {
      body = await readJsonBody(req)
    } catch {
      sendJsonRpcError(res, 400, 'Bad Request: request body is not valid JSON')
      return
    }

    if (!isInitializeRequest(body)) {
      sendJsonRpcError(res, 400, 'Bad Request: No valid session ID provided')
      return
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        streamableTransports.set(sid, transport)
      },
    })

    const server = createServerInstance()

    transport.onclose = () => {
      activeServers.delete(server)
      const sid = transport.sessionId
      if (sid) {
        streamableTransports.delete(sid)
      }
    }

    transport.onerror = (error: Error) => {
      console.error('Streamable HTTP transport error:', error)
    }

    // `StreamableHTTPServerTransport` declares `onclose`/`onerror` as
    // get/set accessor pairs typed `(() => void) | undefined`, rather than
    // the plain optional field `Transport` declares them as. Under
    // `exactOptionalPropertyTypes` those are structurally incompatible even
    // though the class fully implements `Transport` at runtime - this is an
    // upstream SDK typing gap (see the `skipLibCheck` note in tsconfig.json
    // for a related one), not a real behavioral mismatch.
    await server.connect(transport as unknown as Transport)
    await transport.handleRequest(req, res, body)
  }

  /**
   * Handle incoming HTTP request.
   */
  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')

    // Health check endpoint - always open, no authentication required.
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', tools: options.adapter.listTools().length }))
      return
    }

    // Every other route requires a verified bearer before any MCP handling.
    const authentication = await authenticateDaemonRequest(req, verifier, logger())
    if (!authentication.ok) {
      res.writeHead(authentication.status, {
        'Content-Type': 'application/json',
        ...(authentication.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
      })
      res.end(JSON.stringify(authentication.body))
      return
    }
    // The SDK transports read `req.auth` and pass it to the handler of every
    // message in this request, so each tool call runs under this request's key.
    const authenticated: AuthenticatedRequest = Object.assign(req, {
      auth: authentication.authInfo,
    })

    // Streamable HTTP transport (current MCP spec)
    if (url.pathname === '/mcp') {
      await handleStreamableHttpRequest(authenticated, res)
      return
    }

    // Legacy SSE endpoint - establish new connection
    if (req.method === 'GET' && url.pathname === '/sse') {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const transport = new SSEServerTransport('/message', res)
      const server = createServerInstance()
      sseTransports.set(transport.sessionId, transport)

      // Handle transport cleanup
      transport.onclose = () => {
        activeServers.delete(server)
        sseTransports.delete(transport.sessionId)
      }

      transport.onerror = (error: Error) => {
        console.error('SSE transport error:', error)
        activeServers.delete(server)
        sseTransports.delete(transport.sessionId)
      }

      // Connect the server, which starts the SSE stream. Do not call
      // `transport.start()` separately - `Server#connect()` already does
      // that, and calling it twice throws ("SSEServerTransport already
      // started!"). That double-start previously went unnoticed because it
      // was caught below and treated as a fatal connect failure, silently
      // deleting the session that was just registered above - the daemon
      // deregistered the session before the client ever got a
      // `sessionId`, so every `POST /message` after that appeared to hit an
      // unknown session.
      try {
        await server.connect(transport)
      } catch (error) {
        console.error('Failed to connect transport:', error)
        activeServers.delete(server)
        sseTransports.delete(transport.sessionId)
      }
      return
    }

    // Legacy SSE endpoint - receive a client-to-server message, routed by
    // the `sessionId` query parameter established via `/sse`.
    if (req.method === 'POST' && url.pathname === '/message') {
      const sessionId = url.searchParams.get('sessionId')
      const transport = sessionId ? sseTransports.get(sessionId) : undefined

      if (!transport) {
        sendJsonRpcError(res, 404, 'Session not found')
        return
      }

      await transport.handlePostMessage(authenticated, res)
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not Found' } }))
  }

  return {
    async start(): Promise<void> {
      if (running) {
        throw new Error('Daemon is already running')
      }

      // Create necessary directories if they don't exist
      // PID file directory
      const pidDir = dirname(pidFile)
      if (!existsSync(pidDir)) {
        mkdirSync(pidDir, { recursive: true })
      }

      // Socket directory (might be different if custom socketPath provided)
      const socketDir = dirname(socketPath)
      if (!existsSync(socketDir)) {
        mkdirSync(socketDir, { recursive: true })
      }

      // Create HTTP server
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      httpServer = createHttpServer(handleRequest)

      // Determine if we should use Unix socket or TCP port
      const useSocket = options.port === undefined

      try {
        if (useSocket) {
          // Remove existing socket if present
          if (existsSync(socketPath)) {
            unlinkSync(socketPath)
          }

          // Listen on Unix socket
          await new Promise<void>((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            httpServer!.listen(socketPath, () => {
              resolve()
            })

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            httpServer!.on('error', (error) => {
              reject(error)
            })
          })
        } else {
          // Listen on TCP port (bind to localhost)
          await new Promise<void>((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            httpServer!.listen(options.port, '127.0.0.1', () => {
              resolve()
            })

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            httpServer!.on('error', (error) => {
              reject(error)
            })
          })
        }

        // Write PID file after server successfully starts
        writeFileSync(pidFile, String(process.pid), 'utf-8')

        running = true

        // Set up graceful shutdown handlers (only in production)
        if (process.env['NODE_ENV'] !== 'test') {
          const cleanup = (): void => {
            void this.stop().then(() => {
              process.exit(0)
            })
          }

          process.on('SIGINT', cleanup)
          process.on('SIGTERM', cleanup)
        }
      } catch (error) {
        // Clean up partial state on failure
        httpServer.close()
        httpServer = null
        // Re-throw the error
        throw error
      }
    },

    async stop(): Promise<void> {
      if (!running) {
        return
      }

      running = false

      // Close all active streamable HTTP and SSE transports. Snapshot into
      // arrays first since each transport's `onclose` handler mutates the
      // map it was read from as a side effect of closing.
      for (const transport of Array.from(streamableTransports.values())) {
        try {
          await transport.close()
        } catch (error) {
          console.error('Error closing streamable HTTP transport:', error)
        }
      }
      streamableTransports.clear()

      for (const transport of Array.from(sseTransports.values())) {
        try {
          await transport.close()
        } catch (error) {
          console.error('Error closing SSE transport:', error)
        }
      }
      sseTransports.clear()

      // Close all active MCP servers
      for (const server of activeServers) {
        try {
          await server.close()
        } catch (error) {
          console.error('Error closing server:', error)
        }
      }
      activeServers.clear()

      // Close HTTP server
      if (httpServer) {
        await new Promise<void>((resolve) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          httpServer!.close(() => {
            resolve()
          })
        })
        httpServer = null
      }

      // Clean up Unix socket (only if we created it)
      if (options.port === undefined && existsSync(socketPath)) {
        unlinkSync(socketPath)
      }

      // Remove PID file
      if (existsSync(pidFile)) {
        unlinkSync(pidFile)
      }
    },

    isRunning(): boolean {
      return running
    },

    get httpServer(): HttpServer | null {
      return httpServer
    },
  }
}

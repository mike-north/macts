/**
 * HTTP/SSE daemon server for MCP.
 *
 * Provides an HTTP server that can listen on Unix socket or TCP port,
 * using Server-Sent Events (SSE) for server-to-client messages and
 * POST requests for client-to-server messages.
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
// Using Server for low-level control over request handlers
// Note: Server is marked as deprecated in favor of McpServer, but we need it
// for low-level request handler registration
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import type { McpPlugin } from '../types.js'
import { VERSION } from '@macts/core'
import { getSocketPath, getPidFile } from './paths.js'

/**
 * Configuration options for the daemon server.
 */
export interface DaemonOptions {
  /** Array of MCP plugins to multiplex */
  readonly plugins: readonly McpPlugin[]

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
 * Create a new daemon server instance.
 *
 * The server will multiplex all provided plugins over HTTP/SSE transport,
 * allowing multiple clients to connect and invoke tools from any plugin.
 *
 * @param options - Daemon configuration
 * @returns DaemonServer instance for lifecycle management
 *
 * @example
 * ```typescript
 * const daemon = createDaemon({
 *   plugins: [calendarPlugin, mailPlugin],
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

  // Build tool registry from all plugins
  const toolHandlers = new Map<string, (args: unknown) => Promise<unknown>>()
  const toolSchemas = new Map<string, { name: string; description: string; inputSchema: unknown }>()

  for (const plugin of options.plugins) {
    for (const tool of plugin.tools) {
      if (toolHandlers.has(tool.name)) {
        throw new Error(`Duplicate tool name: ${tool.name}`)
      }
      toolHandlers.set(tool.name, tool.handler)
      toolSchemas.set(tool.name, {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })
    }
  }

  /**
   * Create an MCP server instance for a single client connection.
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  function createServerInstance(_transport: SSEServerTransport): Server {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const server = new Server(
      {
        name: options.name ?? 'macts-mcp-daemon',
        version: options.version ?? VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    // Register handlers
    server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: Array.from(toolSchemas.values()),
      }
    })

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params

      const handler = toolHandlers.get(name)
      if (!handler) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        }
      }

      try {
        const result = await handler(args ?? {})

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${message}`,
            },
          ],
          isError: true,
        }
      }
    })

    activeServers.add(server)

    return server
  }

  /**
   * Handle incoming HTTP request.
   */
  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', plugins: options.plugins.length }))
      return
    }

    // SSE endpoint - establish new connection
    if (req.method === 'GET' && req.url === '/sse') {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const transport = new SSEServerTransport('/message', res)
      const server = createServerInstance(transport)

      // Handle transport cleanup
      transport.onclose = () => {
        activeServers.delete(server)
      }

      transport.onerror = (error: Error) => {
        console.error('SSE transport error:', error)
        activeServers.delete(server)
      }

      // Start SSE stream and connect server
      try {
        await transport.start()
        await server.connect(transport)
      } catch (error) {
        console.error('Failed to connect transport:', error)
        activeServers.delete(server)
      }
      return
    }

    // POST endpoint - receive messages
    // Note: SSEServerTransport handles routing via session ID
    // For now, we'll return 404 if no handler is found
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
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

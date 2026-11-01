import { Command, Option } from 'clipanion'
import { createDaemon, getSocketPath, type DaemonServer } from '@macts/mcp'
import { createMcpHost } from '../../host/mcp-host.js'
import { warnIfRemovedTrustSwitchSet } from '../../removed-options.js'

/**
 * Start the MCP HTTP daemon in the foreground.
 *
 * The daemon serves every installed app's operations, and the built-in
 * capability-discovery tool, as MCP tools over HTTP (Streamable HTTP, and the
 * legacy SSE transport). The tools and the runtime behind them are built by
 * {@link createMcpHost}, exactly as for `macts --mcp`; each request presents
 * its own API key as a Bearer token, and each tool call runs under the key of
 * the request that carried it.
 */
export class McpServeCommand extends Command {
  static override paths = [['mcp', 'serve']]

  static override usage = Command.Usage({
    description: 'Start the MCP HTTP server in foreground',
    details: `
      Starts the MCP daemon server in the foreground. Use Ctrl+C to stop.

      The server will:

      - Serve every installed app's operations as MCP tools, plus a built-in capability-discovery tool
      - Listen on Unix socket or TCP port
      - Handle MCP protocol requests over HTTP/SSE

      This is useful for development and debugging. For production use,
      consider running the server in the background with 'macts mcp start'.
      For an MCP client that starts the server itself over stdio, use
      'macts --mcp' instead.

      Every route except GET /health requires an API key as a Bearer token
      (Authorization: Bearer macts_sk_...). Every tool call runs under the
      key of the request that carried it, with the same permissions and
      governance policy as the HTTP API. Create a key with
      'macts api-key create --name <name> --permission <app:resource:operation>'.
    `,
    examples: [
      ['Start on default Unix socket', '$0 mcp serve'],
      ['Start on TCP port', '$0 mcp serve --port 3000'],
      ['Use custom socket path', '$0 mcp serve --socket /tmp/mcp.sock'],
    ],
  })

  port = Option.String('--port', { description: 'TCP port to listen on' })
  socket = Option.String('--socket', { description: 'Unix socket path' })

  async execute(): Promise<number> {
    const stderr = this.context.stderr
    warnIfRemovedTrustSwitchSet(process.env, stderr)

    let daemon: DaemonServer
    let toolCount: number
    try {
      const host = await createMcpHost({ env: process.env, diagnostics: stderr })
      toolCount = host.adapter.listTools().length
      const port = this.port !== undefined ? parseInt(this.port, 10) : undefined
      daemon = createDaemon({
        adapter: host.adapter,
        ...(port !== undefined && { port }),
        socketPath: this.socket ?? getSocketPath(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      stderr.write(`Failed to start MCP server: ${message}\n`)
      return 1
    }

    try {
      // Start the daemon
      await daemon.start()

      const endpoint =
        this.port !== undefined ? `http://127.0.0.1:${this.port}` : (this.socket ?? getSocketPath())

      stderr.write(`MCP server running at ${endpoint}\n`)
      stderr.write(`Serving ${String(toolCount)} tool(s)\n`)
      stderr.write('Press Ctrl+C to stop.\n')

      // Block until signal received
      await new Promise<void>((resolve) => {
        const cleanup = async (): Promise<void> => {
          await daemon.stop()
          resolve()
        }
        process.on('SIGINT', () => {
          void cleanup()
        })
        process.on('SIGTERM', () => {
          void cleanup()
        })
      })

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      stderr.write(`Failed to start MCP server: ${message}\n`)
      return 1
    }
  }
}

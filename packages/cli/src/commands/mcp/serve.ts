import { Command, Option } from 'clipanion'
import { createDaemon, discoverMcpPlugins, getSocketPath } from '@macts/mcp'

/**
 * Start MCP server in foreground.
 *
 * This command runs the MCP daemon server in the foreground, allowing
 * you to see logs and stop it with Ctrl+C. Useful for development
 * and debugging.
 */
export class McpServeCommand extends Command {
  static override paths = [['mcp', 'serve']]

  static override usage = Command.Usage({
    description: 'Start MCP server in foreground',
    details: `
      Starts the MCP daemon server in the foreground. Use Ctrl+C to stop.

      The server will:
      - Load all installed MCP plugins
      - Listen on Unix socket or TCP port
      - Handle MCP protocol requests over HTTP/SSE

      This is useful for development and debugging. For production use,
      consider running the server in the background with 'macts mcp start'.
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
    // Discover MCP plugins
    const { plugins, errors } = await discoverMcpPlugins()

    // Log plugin load errors to stderr
    if (errors.length > 0) {
      for (const err of errors) {
        this.context.stderr.write(
          `Warning: Failed to load plugin ${err.packageName}: ${err.message}\n`
        )
      }
    }

    if (plugins.length === 0) {
      this.context.stderr.write(
        'No MCP plugins found. Install plugins with: macts plugin install\n'
      )
      return 1
    }

    // Create daemon instance
    const port = this.port !== undefined ? parseInt(this.port, 10) : undefined
    const daemon = createDaemon({
      plugins,
      ...(port !== undefined && { port }),
      socketPath: this.socket ?? getSocketPath(),
    })

    try {
      // Start the daemon
      await daemon.start()

      const endpoint =
        this.port !== undefined ? `http://127.0.0.1:${this.port}` : (this.socket ?? getSocketPath())

      this.context.stderr.write(`MCP server running at ${endpoint}\n`)
      this.context.stderr.write(`Loaded ${String(plugins.length)} plugin(s)\n`)
      this.context.stderr.write('Press Ctrl+C to stop.\n')

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
      this.context.stderr.write(`Failed to start MCP server: ${message}\n`)
      return 1
    }
  }
}

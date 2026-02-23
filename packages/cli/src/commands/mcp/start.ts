import { Command, Option } from 'clipanion'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { getPidFile, getSocketPath } from '@macts/mcp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Start MCP server in background.
 *
 * This command starts the MCP daemon server as a background process,
 * detached from the current terminal. The server will continue running
 * even after the terminal is closed.
 */
export class McpStartCommand extends Command {
  static override paths = [['mcp', 'start']]

  static override usage = Command.Usage({
    description: 'Start MCP server in background',
    details: `
      Starts the MCP daemon server as a background process.

      The server will:
      - Run detached from the terminal
      - Continue running after terminal closes
      - Write logs to ~/.macts/mcp.log
      - Store its PID in ~/.macts/mcp.pid

      Use 'macts mcp stop' to stop the server.
      Use 'macts mcp status' to check if it's running.
    `,
    examples: [
      ['Start on default Unix socket', '$0 mcp start'],
      ['Start on TCP port', '$0 mcp start --port 3000'],
      ['Use custom socket path', '$0 mcp start --socket /tmp/mcp.sock'],
    ],
  })

  port = Option.String('--port', { description: 'TCP port to listen on' })
  socket = Option.String('--socket', { description: 'Unix socket path' })

  async execute(): Promise<number> {
    const pidFile = getPidFile()

    // Check if daemon is already running
    if (existsSync(pidFile)) {
      const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10)

      // Check if process is actually running
      try {
        process.kill(pid, 0) // Signal 0 checks existence without killing
        this.context.stderr.write(`MCP server is already running (PID ${String(pid)})\n`)
        this.context.stderr.write('Use `macts mcp stop` to stop it first.\n')
        return 1
      } catch {
        // Process doesn't exist, stale PID file
        this.context.stderr.write('Removing stale PID file...\n')
      }
    }

    // Resolve path to the CLI binary
    // In development: packages/cli/dist/bin.js
    // In production: node_modules/.bin/macts points to dist/bin.js
    const currentFile = fileURLToPath(import.meta.url)
    const cliDir = dirname(dirname(currentFile)) // Go up to cli/dist/
    const binPath = join(cliDir, 'bin.js')

    if (!existsSync(binPath)) {
      this.context.stderr.write(`Error: Cannot find macts binary at ${binPath}\n`)
      return 1
    }

    // Build command arguments
    const args = ['mcp', 'serve']
    if (this.port !== undefined) {
      args.push('--port', this.port)
    }
    if (this.socket !== undefined) {
      args.push('--socket', this.socket)
    }

    // Spawn daemon process
    const child = spawn(process.execPath, [binPath, ...args], {
      detached: true,
      stdio: 'ignore',
    })

    // Detach from parent
    child.unref()

    // Give it a moment to start
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })

    // Verify it started
    if (existsSync(pidFile)) {
      const pid = readFileSync(pidFile, 'utf-8').trim()
      const endpoint =
        this.port !== undefined ? `http://127.0.0.1:${this.port}` : (this.socket ?? getSocketPath())

      this.context.stdout.write(`MCP server started (PID ${pid})\n`)
      this.context.stdout.write(`Endpoint: ${endpoint}\n`)
      this.context.stdout.write('Use `macts mcp stop` to stop the server.\n')
      return 0
    } else {
      this.context.stderr.write('Failed to start MCP server\n')
      this.context.stderr.write('Check logs at ~/.macts/mcp.log for details\n')
      return 1
    }
  }
}

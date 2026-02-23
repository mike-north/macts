import { Command } from 'clipanion'
import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { getPidFile } from '@macts/mcp'

/**
 * Stop the MCP daemon server.
 *
 * This command stops a running MCP daemon by reading the PID file
 * and sending SIGTERM to the process.
 */
export class McpStopCommand extends Command {
  static override paths = [['mcp', 'stop']]

  static override usage = Command.Usage({
    description: 'Stop MCP daemon server',
    details: `
      Stops the MCP daemon server running in the background.

      This will:
      - Read the PID from ~/.macts/mcp.pid
      - Send SIGTERM to the process
      - Wait for graceful shutdown
      - Remove the PID file

      If the process doesn't stop within 10 seconds, it will be
      forcefully terminated with SIGKILL.
    `,
    examples: [['Stop the daemon', '$0 mcp stop']],
  })

  async execute(): Promise<number> {
    const pidFile = getPidFile()

    // Check if PID file exists
    if (!existsSync(pidFile)) {
      this.context.stdout.write('MCP server is not running\n')
      return 0
    }

    // Read PID
    const pidStr = readFileSync(pidFile, 'utf-8').trim()
    const pid = parseInt(pidStr, 10)

    if (isNaN(pid)) {
      this.context.stderr.write(`Invalid PID in ${pidFile}: ${pidStr}\n`)
      return 1
    }

    // Check if process exists
    try {
      process.kill(pid, 0) // Signal 0 checks existence
    } catch {
      this.context.stdout.write(`Process ${String(pid)} is not running (stale PID file)\n`)
      // Clean up stale PID file
      try {
        unlinkSync(pidFile)
      } catch {
        // Ignore cleanup errors
      }
      return 0
    }

    // Send SIGTERM for graceful shutdown
    this.context.stdout.write(`Stopping MCP server (PID ${String(pid)})...\n`)
    try {
      process.kill(pid, 'SIGTERM')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Failed to send SIGTERM: ${message}\n`)
      return 1
    }

    // Wait for process to stop (with timeout)
    const maxWaitMs = 10000
    const checkIntervalMs = 100
    let waited = 0

    while (waited < maxWaitMs) {
      // Check if process still exists
      try {
        process.kill(pid, 0)
      } catch {
        // Process stopped
        this.context.stdout.write('MCP server stopped successfully\n')
        return 0
      }

      await new Promise((resolve) => {
        setTimeout(resolve, checkIntervalMs)
      })
      waited += checkIntervalMs
    }

    // Timeout reached, force kill
    this.context.stderr.write('Process did not stop gracefully, forcing shutdown...\n')
    try {
      process.kill(pid, 'SIGKILL')
      this.context.stdout.write('MCP server stopped (forced)\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Failed to force stop: ${message}\n`)
      return 1
    }
  }
}

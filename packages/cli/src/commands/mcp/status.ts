import { Command, Option } from 'clipanion'
import { readFileSync, existsSync } from 'node:fs'
import { getPidFile, getSocketPath } from '@macts/mcp'
import { request } from 'node:http'
import { createFormatter } from '../../output/index.js'

/**
 * Response from daemon health check endpoint.
 */
interface HealthResponse {
  status: string
  plugins: number
}

/**
 * Check MCP daemon server status.
 *
 * This command checks if the MCP daemon is running and responds
 * to health check requests. It verifies:
 * - PID file exists
 * - Process is running
 * - Socket/port responds to health checks
 */
export class McpStatusCommand extends Command {
  static override paths = [['mcp', 'status']]

  static override usage = Command.Usage({
    description: 'Check MCP daemon status',
    details: `
      Checks the status of the MCP daemon server.

      This command verifies:
      - PID file exists
      - Process is running
      - Server responds to health checks
      - Number of loaded plugins

      Exit codes:
      - 0: Server is running and healthy
      - 1: Server is not running or unhealthy
    `,
    examples: [
      ['Check status', '$0 mcp status'],
      ['Check status as JSON', '$0 mcp status --json'],
    ],
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)
    const pidFile = getPidFile()
    const socketPath = getSocketPath()

    // Check if PID file exists
    if (!existsSync(pidFile)) {
      this.context.stdout.write(formatter.formatError('MCP server is not running') + '\n')
      return 1
    }

    // Read and validate PID
    const pidStr = readFileSync(pidFile, 'utf-8').trim()
    const pid = parseInt(pidStr, 10)

    if (isNaN(pid)) {
      this.context.stdout.write(
        formatter.formatError(`Invalid PID in ${pidFile}: ${pidStr}`) + '\n'
      )
      return 1
    }

    // Check if process is running
    try {
      process.kill(pid, 0) // Signal 0 checks existence
    } catch {
      this.context.stdout.write(
        formatter.formatError(`Process ${String(pid)} is not running (stale PID file)`) + '\n'
      )
      return 1
    }

    // Try to connect to health endpoint
    try {
      const health = await this.checkHealth(socketPath)

      if (this.json ?? false) {
        this.context.stdout.write(
          JSON.stringify(
            {
              running: true,
              pid,
              endpoint: socketPath,
              health,
            },
            null,
            2
          ) + '\n'
        )
      } else {
        this.context.stdout.write(formatter.formatSuccess('MCP server is running') + '\n')
        this.context.stdout.write(`PID: ${String(pid)}\n`)
        this.context.stdout.write(`Endpoint: ${socketPath}\n`)
        this.context.stdout.write(`Plugins: ${String(health.plugins)}\n`)
        this.context.stdout.write(`Status: ${health.status}\n`)
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (this.json ?? false) {
        this.context.stdout.write(
          JSON.stringify(
            {
              running: true,
              pid,
              endpoint: socketPath,
              health: null,
              error: message,
            },
            null,
            2
          ) + '\n'
        )
      } else {
        this.context.stdout.write(
          formatter.formatError(`Process is running but health check failed: ${message}`) + '\n'
        )
        this.context.stdout.write(`PID: ${String(pid)}\n`)
        this.context.stdout.write(`Endpoint: ${socketPath}\n`)
      }

      return 1
    }
  }

  /**
   * Check daemon health by making HTTP request to /health endpoint.
   */
  private async checkHealth(socketPath: string): Promise<HealthResponse> {
    return new Promise((resolve, reject) => {
      const req = request(
        {
          socketPath,
          path: '/health',
          method: 'GET',
          timeout: 5000,
        },
        (res) => {
          let data = ''

          res.on('data', (chunk: Buffer) => {
            data += chunk.toString()
          })

          res.on('end', () => {
            try {
              const json = JSON.parse(data) as HealthResponse
              resolve(json)
            } catch (_error) {
              reject(new Error(`Invalid health response: ${data}`))
            }
          })
        }
      )

      req.on('error', (error) => {
        reject(error)
      })

      req.end()
    })
  }
}

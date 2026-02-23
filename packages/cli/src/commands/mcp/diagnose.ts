import { Command } from 'clipanion'
import { readFileSync, existsSync } from 'node:fs'
import { getPidFile, getSocketPath, discoverMcpPlugins } from '@macts/mcp'
import { request } from 'node:http'
import type { Stats } from 'node:fs'
import { stat } from 'node:fs/promises'

/**
 * Diagnostic information about the daemon process.
 */
interface DaemonDiagnostics {
  pidFileExists: boolean
  pidFilePath: string
  pid: number | null
  processRunning: boolean
  processError: string | null
}

/**
 * Diagnostic information about the Unix socket.
 */
interface SocketDiagnostics {
  socketPath: string
  socketExists: boolean
  socketStats: Stats | null
  connectionError: string | null
  healthCheck: {
    success: boolean
    status?: string
    plugins?: number
    error?: string
  }
}

/**
 * Diagnostic information about MCP plugins.
 */
interface PluginDiagnostics {
  totalFound: number
  totalErrors: number
  plugins: { name: string; description: string; tools: number }[]
  errors: { packageName: string; error: string }[]
}

/**
 * Complete diagnostic report.
 */
interface DiagnosticReport {
  timestamp: string
  daemon: DaemonDiagnostics
  socket: SocketDiagnostics
  plugins: PluginDiagnostics
  recommendations: string[]
}

/**
 * Diagnose MCP server issues.
 *
 * This command produces detailed diagnostic information for troubleshooting
 * MCP server problems. It checks:
 * - Daemon process status
 * - Socket file and permissions
 * - Plugin loading
 * - Health endpoint connectivity
 *
 * This command is called automatically by the fast stdio adapter when
 * it encounters errors, providing actionable debugging information.
 */
export class McpDiagnoseCommand extends Command {
  static override paths = [['mcp', 'diagnose']]

  static override usage = Command.Usage({
    description: 'Diagnose MCP server issues',
    details: `
      Produces detailed diagnostic information for troubleshooting MCP issues.

      This command checks:
      - Daemon process status (PID file, running process)
      - Unix socket status (exists, permissions, connectivity)
      - Plugin discovery (loaded plugins, errors)
      - Health endpoint (connectivity, response)

      The output includes specific recommendations for fixing any issues found.

      This command is automatically invoked by the fast stdio adapter when
      it encounters errors connecting to the daemon.

      Exit codes:
      - 0: No issues found
      - 1: Issues found (see recommendations)
    `,
    examples: [['Run diagnostics', '$0 mcp diagnose']],
  })

  async execute(): Promise<number> {
    const diagnostics: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      daemon: this.checkDaemon(),
      socket: await this.checkSocket(),
      plugins: await this.checkPlugins(),
      recommendations: [],
    }

    // Generate recommendations based on findings
    const recommendations = this.generateRecommendations(diagnostics)
    diagnostics.recommendations = recommendations

    // Output JSON report
    this.context.stdout.write(JSON.stringify(diagnostics, null, 2) + '\n')

    // Return exit code based on whether issues were found
    return recommendations.length > 0 ? 1 : 0
  }

  /**
   * Check daemon process status.
   */
  private checkDaemon(): DaemonDiagnostics {
    const pidFile = getPidFile()
    const diagnostics: DaemonDiagnostics = {
      pidFileExists: false,
      pidFilePath: pidFile,
      pid: null,
      processRunning: false,
      processError: null,
    }

    // Check PID file
    diagnostics.pidFileExists = existsSync(pidFile)

    if (!diagnostics.pidFileExists) {
      return diagnostics
    }

    // Read PID
    try {
      const pidStr = readFileSync(pidFile, 'utf-8').trim()
      const pid = parseInt(pidStr, 10)

      if (isNaN(pid)) {
        diagnostics.processError = `Invalid PID in file: ${pidStr}`
        return diagnostics
      }

      diagnostics.pid = pid

      // Check if process is running
      try {
        process.kill(pid, 0) // Signal 0 checks existence
        diagnostics.processRunning = true
      } catch (error) {
        diagnostics.processError = error instanceof Error ? error.message : String(error)
      }
    } catch (error) {
      diagnostics.processError = error instanceof Error ? error.message : String(error)
    }

    return diagnostics
  }

  /**
   * Check Unix socket status.
   */
  private async checkSocket(): Promise<SocketDiagnostics> {
    const socketPath = getSocketPath()
    const diagnostics: SocketDiagnostics = {
      socketPath,
      socketExists: false,
      socketStats: null,
      connectionError: null,
      healthCheck: {
        success: false,
      },
    }

    // Check if socket exists
    diagnostics.socketExists = existsSync(socketPath)

    if (diagnostics.socketExists) {
      // Get socket stats
      try {
        diagnostics.socketStats = await stat(socketPath)
      } catch (error) {
        diagnostics.connectionError = error instanceof Error ? error.message : String(error)
      }
    }

    // Try health check
    try {
      const health = await this.healthCheck(socketPath)
      diagnostics.healthCheck = {
        success: true,
        status: health.status,
        plugins: health.plugins,
      }
    } catch (error) {
      diagnostics.healthCheck = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    return diagnostics
  }

  /**
   * Check plugin discovery status.
   */
  private async checkPlugins(): Promise<PluginDiagnostics> {
    const { plugins, errors } = await discoverMcpPlugins()

    return {
      totalFound: plugins.length,
      totalErrors: errors.length,
      plugins: plugins.map((p) => ({
        name: p.name,
        description: p.description,
        tools: p.tools.length,
      })),
      errors: errors.map((e) => ({
        packageName: e.packageName,
        error: e.message,
      })),
    }
  }

  /**
   * Perform health check on daemon.
   */
  private async healthCheck(socketPath: string): Promise<{ status: string; plugins: number }> {
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
              const json = JSON.parse(data) as { status: string; plugins: number }
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

  /**
   * Generate recommendations based on diagnostic findings.
   */
  private generateRecommendations(diagnostics: DiagnosticReport): string[] {
    const recommendations: string[] = []

    // Check daemon status
    if (!diagnostics.daemon.pidFileExists) {
      recommendations.push('Daemon is not running. Start it with: macts mcp start')
    } else if (!diagnostics.daemon.processRunning) {
      recommendations.push(
        'PID file exists but process is not running. Clean up with: macts mcp stop'
      )
    }

    // Check socket status
    if (diagnostics.daemon.processRunning && !diagnostics.socket.socketExists) {
      recommendations.push(
        'Process is running but socket file is missing. Restart daemon with: macts mcp stop && macts mcp start'
      )
    }

    if (diagnostics.socket.socketExists && !diagnostics.socket.healthCheck.success) {
      recommendations.push(
        `Socket exists but health check failed: ${diagnostics.socket.healthCheck.error ?? 'unknown error'}. Try restarting: macts mcp stop && macts mcp start`
      )
    }

    // Check plugin status
    if (diagnostics.plugins.totalFound === 0 && diagnostics.plugins.totalErrors === 0) {
      recommendations.push(
        'No MCP plugins found. Install plugins with: macts plugin install <package>'
      )
    }

    if (diagnostics.plugins.totalErrors > 0) {
      recommendations.push(
        `${String(diagnostics.plugins.totalErrors)} plugin(s) failed to load. Check plugin installation and compatibility.`
      )
      for (const error of diagnostics.plugins.errors) {
        recommendations.push(`  - ${error.packageName}: ${error.error}`)
      }
    }

    // Check for running but no plugins loaded
    if (
      diagnostics.daemon.processRunning &&
      diagnostics.socket.healthCheck.success &&
      diagnostics.socket.healthCheck.plugins === 0
    ) {
      recommendations.push(
        'Daemon is running but no plugins are loaded. Install plugins or check plugin discovery.'
      )
    }

    return recommendations
  }
}

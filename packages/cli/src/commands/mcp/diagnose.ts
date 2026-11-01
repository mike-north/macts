import { Command } from 'clipanion'
import { readFileSync, existsSync } from 'node:fs'
import { getPidFile, getSocketPath } from '@macts/mcp'
import { loadInstalledApps } from '../../host/installed-apps.js'
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
    /** How many tools the running daemon serves, from its health endpoint. */
    tools?: number
    error?: string
  }
}

/**
 * Diagnostic information about the installed apps an MCP server serves: the
 * same host registration path `macts --mcp` and `macts mcp serve` load them
 * through.
 */
interface AppDiagnostics {
  /** How many installed apps loaded and can be registered. */
  totalLoaded: number
  /** How many installed apps failed to load. */
  totalFailed: number
  /** Each loaded app, its host package, and how many operations it serves. */
  apps: { app: string; hostPackage: string; operations: number }[]
  /** Each app that failed to load, and why. */
  failed: { app: string; reason: string }[]
  /** Each app package installed without the host package that serves it. */
  missingHost: { app: string; hostPackage: string; installCommand: string }[]
}

/**
 * Complete diagnostic report.
 */
interface DiagnosticReport {
  timestamp: string
  daemon: DaemonDiagnostics
  socket: SocketDiagnostics
  apps: AppDiagnostics
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
      - Installed apps (loaded apps and their operations, failures)
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
      apps: await this.checkApps(),
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
        tools: health.tools,
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
   * Check which installed apps load, through the host registration path.
   */
  private async checkApps(): Promise<AppDiagnostics> {
    const { loaded, failed, missingHost } = await loadInstalledApps()

    return {
      totalLoaded: loaded.length,
      totalFailed: failed.length,
      apps: loaded.map(({ app, hostPackage, contract }) => ({
        app,
        hostPackage,
        operations: Object.keys(contract.operations).length,
      })),
      failed: failed.map(({ app, reason }) => ({ app, reason })),
      missingHost: missingHost.map(({ app, hostPackage, installCommand }) => ({
        app,
        hostPackage,
        installCommand,
      })),
    }
  }

  /**
   * Perform health check on daemon.
   */
  private async healthCheck(socketPath: string): Promise<{ status: string; tools: number }> {
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
              const json = JSON.parse(data) as { status: string; tools: number }
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

    // Check installed apps
    const { apps } = diagnostics
    if (apps.totalLoaded === 0 && apps.totalFailed === 0 && apps.missingHost.length === 0) {
      recommendations.push(
        "No apps are installed. Install an app's server package with: macts mcp install <app>"
      )
    }

    if (apps.totalFailed > 0) {
      recommendations.push(
        `${String(apps.totalFailed)} app(s) failed to load. Reinstall them with: macts mcp install <app>`
      )
      for (const { app, reason } of apps.failed) {
        recommendations.push(`  - ${app}: ${reason}`)
      }
    }

    for (const { app, hostPackage, installCommand } of apps.missingHost) {
      recommendations.push(
        `${app} is installed without ${hostPackage}. Install it with: ${installCommand}`
      )
    }

    // Check for a running daemon that serves nothing
    if (
      diagnostics.daemon.processRunning &&
      diagnostics.socket.healthCheck.success &&
      diagnostics.socket.healthCheck.tools === 0
    ) {
      recommendations.push(
        "Daemon is running but serves no tools. Install an app's server package and restart it."
      )
    }

    return recommendations
  }
}

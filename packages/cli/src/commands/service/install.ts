import { Command, Option } from 'clipanion'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { generatePlist } from './plist.js'

const PLIST_LABEL = 'com.macts.server'
const PLIST_DIR = join(process.env['HOME'] ?? '', 'Library/LaunchAgents')
const LOG_DIR = join(process.env['HOME'] ?? '', '.macts/logs')

/**
 * Install the macts service as a macOS launchd agent.
 */
export class ServiceInstallCommand extends Command {
  static override paths = [['service', 'install']]

  static override usage = Command.Usage({
    description: 'Install macts as a launchd service',
    details: `
      Installs the macts server as a macOS launchd agent that starts
      automatically at login.

      This will:
      - Generate a launchd plist configuration
      - Write it to ~/Library/LaunchAgents/com.macts.server.plist
      - Load the service via launchctl

      Use 'macts service uninstall' to remove the service.
      Use 'macts service status' to check if it's running.
    `,
    examples: [
      ['Install with defaults', '$0 service install'],
      ['Install on a specific port', '$0 service install --port 3000'],
    ],
  })

  port = Option.String('--port', { description: 'TCP port for the service to listen on' })

  async execute(): Promise<number> {
    const plistPath = join(PLIST_DIR, `${PLIST_LABEL}.plist`)

    // Determine the macts binary path
    const program = process.argv[1] ?? ''
    if (program === '') {
      this.context.stderr.write('Error: Could not determine macts binary path\n')
      return 1
    }

    // Create log directory if it doesn't exist
    if (!existsSync(LOG_DIR)) {
      try {
        mkdirSync(LOG_DIR, { recursive: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.context.stderr.write(`Error: Failed to create log directory: ${message}\n`)
        return 1
      }
    }

    // Parse port if provided
    const port = this.port !== undefined ? parseInt(this.port, 10) : undefined
    if (port !== undefined && (isNaN(port) || port < 1 || port > 65535)) {
      this.context.stderr.write('Error: Port must be a number between 1 and 65535\n')
      return 1
    }

    // Generate plist content
    const plistContent = generatePlist({
      label: PLIST_LABEL,
      program,
      logDir: LOG_DIR,
      ...(port !== undefined ? { port } : {}),
    })

    // Write plist file
    try {
      writeFileSync(plistPath, plistContent, 'utf-8')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Error: Failed to write plist file: ${message}\n`)
      return 1
    }

    // Load the service via launchctl
    try {
      await execFileAsync('launchctl', ['load', plistPath])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(`Error: Failed to load service: ${message}\n`)
      return 1
    }

    this.context.stdout.write(`Service installed and loaded: ${PLIST_LABEL}\n`)
    this.context.stdout.write(`Plist: ${plistPath}\n`)
    this.context.stdout.write(`Logs: ${LOG_DIR}\n`)
    if (port !== undefined) {
      this.context.stdout.write(`Port: ${String(port)}\n`)
    }
    return 0
  }
}

/**
 * Promise wrapper around child_process.execFile.
 */
function execFileAsync(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

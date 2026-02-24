import { Command } from 'clipanion'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'

const PLIST_LABEL = 'com.macts.server'
const PLIST_DIR = join(process.env['HOME'] ?? '', 'Library/LaunchAgents')

/**
 * Check the status of the macts launchd service.
 */
export class ServiceStatusCommand extends Command {
  static override paths = [['service', 'status']]

  static override usage = Command.Usage({
    description: 'Check macts launchd service status',
    details: `
      Checks whether the macts launchd service is installed and running.

      Reports:
      - Not installed (no plist file)
      - Running (with PID)
      - Stopped (loaded but not running)
    `,
    examples: [['Check service status', '$0 service status']],
  })

  async execute(): Promise<number> {
    const plistPath = join(PLIST_DIR, `${PLIST_LABEL}.plist`)

    // Check if plist file exists
    if (!existsSync(plistPath)) {
      this.context.stdout.write('Service not installed\n')
      this.context.stdout.write('Use `macts service install` to install.\n')
      return 1
    }

    // Run launchctl list to check service status
    try {
      const output = await execFileAsync('launchctl', ['list', PLIST_LABEL])
      const pidMatch = /^"PID"\s*=\s*(\d+)/m.exec(output)

      if (pidMatch?.[1] !== undefined) {
        this.context.stdout.write(`Service running (PID ${pidMatch[1]})\n`)
      } else {
        // Service is loaded but no PID — check for exit status
        const statusMatch = /^"LastExitStatus"\s*=\s*(\d+)/m.exec(output)
        if (statusMatch?.[1] !== undefined) {
          this.context.stdout.write(`Service stopped (last exit status: ${statusMatch[1]})\n`)
        } else {
          this.context.stdout.write('Service loaded but not running\n')
        }
      }

      return 0
    } catch {
      // launchctl list fails if the service is not loaded
      this.context.stdout.write('Service installed but not loaded\n')
      this.context.stdout.write('Run `macts service install` to reload.\n')
      return 1
    }
  }
}

/**
 * Promise wrapper around child_process.execFile.
 */
function execFileAsync(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout) => {
      if (error) {
        reject(error instanceof Error ? error : new Error(JSON.stringify(error)))
      } else {
        resolve(stdout)
      }
    })
  })
}

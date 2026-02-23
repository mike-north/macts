import { Command } from 'clipanion'
import { unlinkSync, existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'

const PLIST_LABEL = 'com.macts.server'
const PLIST_DIR = join(process.env['HOME'] ?? '', 'Library/LaunchAgents')

/**
 * Uninstall the macts launchd service.
 */
export class ServiceUninstallCommand extends Command {
  static override paths = [['service', 'uninstall']]

  static override usage = Command.Usage({
    description: 'Uninstall macts launchd service',
    details: `
      Removes the macts launchd agent.

      This will:
      - Unload the service via launchctl
      - Remove the plist file from ~/Library/LaunchAgents/

      The service will no longer start automatically at login.
    `,
    examples: [['Uninstall the service', '$0 service uninstall']],
  })

  async execute(): Promise<number> {
    const plistPath = join(PLIST_DIR, `${PLIST_LABEL}.plist`)

    // Attempt to unload the service (ignore errors if not loaded)
    try {
      await execFileAsync('launchctl', ['unload', plistPath])
    } catch {
      // Ignore errors — the service may not be loaded
    }

    // Remove the plist file if it exists
    if (existsSync(plistPath)) {
      try {
        unlinkSync(plistPath)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.context.stderr.write(`Error: Failed to remove plist file: ${message}\n`)
        return 1
      }
    }

    this.context.stdout.write(`Service uninstalled: ${PLIST_LABEL}\n`)
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

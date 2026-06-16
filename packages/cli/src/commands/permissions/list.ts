import { Command, Option } from 'clipanion'
import { loadManifest, generatePermissionMap } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import * as path from 'node:path'
import * as fs from 'node:fs'

/**
 * List all permissions for an app.
 */
export class PermissionsListCommand extends Command {
  static override paths = [['permissions', 'list']]

  static override usage = Command.Usage({
    description: 'List all permissions for an app',
    details: `
      Shows all fine-grained and coarse permissions defined in a manifest.

      Fine-grained permissions are one per command (calendar:events:list) and
      authorize that call directly. Coarse permissions (calendar:events:read)
      are sugar that group related fine-grained permissions; they only
      authorize calls after being expanded against this manifest at key
      creation time.
    `,
    examples: [
      ['List calendar permissions', '$0 permissions list --manifest ./manifests/calendar/app.yaml'],
      ['Output as JSON', '$0 permissions list --manifest ./manifest.yaml --json'],
    ],
  })

  manifest = Option.String('--manifest', { required: true, description: 'Path to manifest file' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const manifestPath = path.resolve(this.manifest)
      if (!fs.existsSync(manifestPath)) {
        this.context.stderr.write(
          formatter.formatError(`Manifest not found: ${manifestPath}`) + '\n'
        )
        return 1
      }

      const manifest = await loadManifest(manifestPath)

      if (!manifest.permissions) {
        this.context.stderr.write(
          formatter.formatError('Manifest has no permissions section') + '\n'
        )
        return 1
      }

      const appName = manifest.app.name.toLowerCase()
      const permMap = generatePermissionMap(appName, manifest.permissions)

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            app: appName,
            coarse: Object.fromEntries(permMap.coarseToFine),
            fine: [...permMap.allFine],
            summary: {
              coarseCount: permMap.allCoarse.size,
              fineCount: permMap.allFine.size,
            },
          }) + '\n'
        )
      } else {
        this.context.stdout.write(
          `\nPermissions for ${manifest.app.displayName ?? manifest.app.name}\n`
        )
        this.context.stdout.write('='.repeat(40) + '\n\n')

        this.context.stdout.write('Coarse Permissions:\n')
        for (const [coarse, fine] of permMap.coarseToFine) {
          this.context.stdout.write(`  ${coarse}\n`)
          for (const f of fine) {
            this.context.stdout.write(`    → ${f}\n`)
          }
        }

        this.context.stdout.write('\nFine-grained Permissions:\n')
        for (const fine of [...permMap.allFine].sort()) {
          this.context.stdout.write(`  ${fine}\n`)
        }

        this.context.stdout.write('\nSummary:\n')
        this.context.stdout.write(`  Coarse permissions: ${String(permMap.allCoarse.size)}\n`)
        this.context.stdout.write(`  Fine-grained permissions: ${String(permMap.allFine.size)}\n`)
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

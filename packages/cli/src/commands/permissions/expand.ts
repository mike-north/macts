import { Command, Option } from 'clipanion'
import { loadManifest, expandCoarsePermission, parsePermission } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import * as path from 'node:path'
import * as fs from 'node:fs'

/**
 * Expand a coarse permission to fine-grained.
 */
export class PermissionsExpandCommand extends Command {
  static override paths = [['permissions', 'expand']]

  static override usage = Command.Usage({
    description: 'Expand a coarse permission to fine-grained permissions',
    details: `
      Shows which fine-grained permissions a coarse or wildcard permission
      expands to.

      This is what happens when you create an API key with a coarse permission.
    `,
    examples: [
      [
        'Expand read permission',
        '$0 permissions expand "calendar:events:read" --manifest ./manifest.yaml',
      ],
      ['Expand wildcard', '$0 permissions expand "calendar:*:read" --manifest ./manifest.yaml'],
    ],
  })

  permission = Option.String({ required: true, name: 'permission' })
  manifest = Option.String('--manifest', { required: true, description: 'Path to manifest file' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      // Validate permission format
      try {
        parsePermission(this.permission)
      } catch (err) {
        this.context.stderr.write(formatter.formatError((err as Error).message) + '\n')
        return 1
      }

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

      const expanded = expandCoarsePermission(this.permission, manifest.permissions)

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            input: this.permission,
            expanded,
            count: expanded.length,
          }) + '\n'
        )
      } else {
        this.context.stdout.write(`\n${this.permission} expands to:\n`)
        for (const perm of expanded.sort()) {
          this.context.stdout.write(`  - ${perm}\n`)
        }
        this.context.stdout.write(`\nTotal: ${String(expanded.length)} permission(s)\n`)
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { createApiKey, type CreateApiKeyResult } from '@macts/api'
import { loadManifest, type PermissionsSection, isValidPermission } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import * as path from 'node:path'
import * as fs from 'node:fs'

/**
 * Create a new API key.
 */
export class ApiKeyCreateCommand extends Command {
  static override paths = [['api-key', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new API key',
    details: `
      Creates a signed API key with the specified permissions.

      Permission format is "app:resource:operation". A grant authorizes a call
      when it matches exactly or via a wildcard:

        - Fine-grained (calendar:events:list) authorizes exactly that call.
        - Resource wildcard (calendar:events:*) authorizes every operation on
          the resource; app wildcard (calendar:*:*) authorizes everything.

      Coarse operations (read/create/write/delete) are sugar that must be
      expanded against a manifest with --manifest; they are resolved into the
      fine-grained operations they cover at creation time. A coarse permission
      without --manifest is rejected (it would authorize nothing), with a hint
      naming the wildcard or fine-grained permissions to use instead.

      The key is displayed once and cannot be retrieved later.
    `,
    examples: [
      [
        'Create a read-only key (all read operations, via manifest expansion)',
        '$0 api-key create --name "CI" --permission "calendar:*:read" --manifest ./manifests/calendar/app.yaml',
      ],
      [
        'Create a key for all operations on a resource',
        '$0 api-key create --name "Bot" --permission "calendar:events:*"',
      ],
      [
        'Create a key with specific fine-grained permissions',
        '$0 api-key create --name "Bot" --permission "calendar:events:list" --permission "calendar:events:create"',
      ],
      [
        'Create a key with expiration',
        '$0 api-key create --name "Temp" --permission "calendar:events:list" --expires 30d',
      ],
    ],
  })

  name = Option.String('--name', { required: true, description: 'Human-readable name for the key' })
  permission = Option.Array('--permission', {
    description: 'Permission to grant (can be repeated)',
  })
  expires = Option.String('--expires', { description: 'Expiration (e.g., 30d, 1h, 2w)' })
  manifest = Option.String('--manifest', {
    description: 'Path to manifest file for permission expansion',
  })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)
    const permissions = this.permission ?? []

    if (permissions.length === 0) {
      this.context.stderr.write(
        formatter.formatError('At least one --permission is required') + '\n'
      )
      return 1
    }

    // Validate permission format
    const invalidPermissions = permissions.filter((p) => !isValidPermission(p))
    if (invalidPermissions.length > 0) {
      this.context.stderr.write(
        formatter.formatError(
          `Invalid permission format: ${invalidPermissions.join(', ')}\n` +
            'Permissions must be in format "app:resource:operation" (e.g., "calendar:events:list" or "calendar:*:*")'
        ) + '\n'
      )
      return 1
    }

    try {
      // Load permissions section from manifest if provided
      let permissionsSection: PermissionsSection | undefined
      if (this.manifest) {
        const manifestPath = path.resolve(this.manifest)
        if (!fs.existsSync(manifestPath)) {
          this.context.stderr.write(
            formatter.formatError(`Manifest not found: ${manifestPath}`) + '\n'
          )
          return 1
        }
        const manifest = await loadManifest(manifestPath)
        permissionsSection = manifest.permissions
      }

      const result = await createApiKey(
        {
          name: this.name,
          permissions,
          expires: this.expires,
        },
        permissionsSection
      )

      if (this.json) {
        this.context.stdout.write(formatter.format(formatResult(result)) + '\n')
      } else {
        this.context.stdout.write('\n')
        this.context.stdout.write(`API Key: ${result.token}\n`)
        this.context.stdout.write(`Key ID: ${result.keyId}\n`)
        this.context.stdout.write(`Name: ${result.metadata.name}\n`)
        this.context.stdout.write(`Permissions: ${result.metadata.permissions.join(', ')}\n`)
        if (result.metadata.expiresAt) {
          this.context.stdout.write(`Expires: ${result.metadata.expiresAt.toISOString()}\n`)
        }
        this.context.stdout.write('\n')
        this.context.stdout.write('Save this key securely - it cannot be retrieved later.\n')
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

function formatResult(result: CreateApiKeyResult): object {
  return {
    token: result.token,
    keyId: result.keyId,
    name: result.metadata.name,
    permissions: result.metadata.permissions,
    originalPermissions: result.metadata.originalPermissions,
    createdAt: result.metadata.createdAt.toISOString(),
    expiresAt: result.metadata.expiresAt?.toISOString(),
  }
}

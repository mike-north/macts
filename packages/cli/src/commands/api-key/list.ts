import { Command, Option } from 'clipanion'
import { loadKeyMetadata } from '@macts/api'
import { createFormatter } from '../../output/index.js'

/**
 * List all API keys.
 */
export class ApiKeyListCommand extends Command {
  static override paths = [['api-key', 'list']]

  static override usage = Command.Usage({
    description: 'List all API keys',
    details: `
      Lists metadata for all API keys created on this machine.

      The actual key tokens are not stored and cannot be retrieved.
      Only metadata (name, permissions, dates, revocation status) is shown.
    `,
    examples: [
      ['List all keys', '$0 api-key list'],
      ['List including revoked', '$0 api-key list --include-revoked'],
      ['Output as JSON', '$0 api-key list --json'],
    ],
  })

  includeRevoked = Option.Boolean('--include-revoked', {
    description: 'Include revoked keys in output',
  })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  // eslint-disable-next-line @typescript-eslint/require-await -- Clipanion requires async execute()
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      let keys = loadKeyMetadata()

      // Filter out revoked keys unless requested
      if (!this.includeRevoked) {
        keys = keys.filter((k) => !k.revoked)
      }

      if (keys.length === 0) {
        if (this.json) {
          this.context.stdout.write(formatter.format({ keys: [] }) + '\n')
        } else {
          this.context.stdout.write('No API keys found.\n')
          this.context.stdout.write(
            'Create one with: macts api-key create --name "My Key" --permission "calendar:*:read"\n'
          )
        }
        return 0
      }

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            keys: keys.map(formatKeyMetadata),
          }) + '\n'
        )
      } else {
        this.context.stdout.write(
          formatter.formatList(keys.map(formatKeyMetadataForTable), {
            columns: [
              { header: 'ID', key: 'id', maxWidth: 20 },
              { header: 'Name', key: 'name', maxWidth: 20 },
              { header: 'Prefix', key: 'keyPrefix', maxWidth: 10 },
              { header: 'Created', key: 'createdAt', maxWidth: 12 },
              { header: 'Expires', key: 'expiresAt', maxWidth: 12 },
              { header: 'Status', key: 'status', maxWidth: 10 },
            ],
          }) + '\n'
        )
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

function formatKeyMetadata(key: import('@macts/api').ApiKeyMetadata): object {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    permissions: key.permissions,
    originalPermissions: key.originalPermissions,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revoked: key.revoked,
  }
}

function formatKeyMetadataForTable(key: import('@macts/api').ApiKeyMetadata): object {
  const now = new Date()
  let status = 'active'
  if (key.revoked) {
    status = 'revoked'
  } else if (key.expiresAt && key.expiresAt < now) {
    status = 'expired'
  }

  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    createdAt: formatDate(key.createdAt),
    expiresAt: key.expiresAt ? formatDate(key.expiresAt) : '-',
    status,
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

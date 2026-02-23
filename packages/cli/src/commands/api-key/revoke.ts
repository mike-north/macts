import { Command, Option } from 'clipanion'
import { revokeKey, getKeyMetadata, extractKeyIdFromToken } from '@macts/api'
import { createFormatter } from '../../output/index.js'

/**
 * Revoke an API key.
 */
export class ApiKeyRevokeCommand extends Command {
  static override paths = [['api-key', 'revoke']]

  static override usage = Command.Usage({
    description: 'Revoke an API key',
    details: `
      Revokes an API key, making it invalid for future use.

      You can specify either the key ID or the full token.
      Revoked keys remain in the list but cannot be used.
    `,
    examples: [
      ['Revoke by ID', '$0 api-key revoke key_abc123'],
      ['Revoke by token', '$0 api-key revoke macts_sk_eyJ...'],
    ],
  })

  keyOrToken = Option.String({ required: true, name: 'key-id-or-token' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      // Determine if input is a token or key ID
      let keyId: string
      if (this.keyOrToken.startsWith('macts_sk_')) {
        const extracted = extractKeyIdFromToken(this.keyOrToken)
        if (!extracted) {
          this.context.stderr.write(formatter.formatError('Invalid token format') + '\n')
          return 1
        }
        keyId = extracted
      } else {
        keyId = this.keyOrToken
      }

      // Check if key exists
      const metadata = getKeyMetadata(keyId)
      if (!metadata) {
        this.context.stderr.write(formatter.formatError(`Key not found: ${keyId}`) + '\n')
        return 1
      }

      if (metadata.revoked) {
        this.context.stderr.write(formatter.formatError('Key is already revoked') + '\n')
        return 1
      }

      // Revoke the key
      const success = revokeKey(keyId)
      if (!success) {
        this.context.stderr.write(formatter.formatError('Failed to revoke key') + '\n')
        return 1
      }

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            success: true,
            keyId,
            name: metadata.name,
          }) + '\n'
        )
      } else {
        this.context.stdout.write(
          formatter.formatSuccess(`Revoked key "${metadata.name}" (${keyId})`) + '\n'
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

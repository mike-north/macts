import { Command, Option } from 'clipanion'
import { validateApiKey, extractPermissionsFromToken, extractKeyIdFromToken } from '@macts/api'
import { createFormatter } from '../../output/index.js'

/**
 * Verify an API key and show its permissions.
 */
export class ApiKeyVerifyCommand extends Command {
  static override paths = [['api-key', 'verify']]

  static override usage = Command.Usage({
    description: 'Verify an API key and show its permissions',
    details: `
      Validates an API key's signature and expiration, then displays
      its permissions and metadata.

      Useful for debugging access issues or inspecting key contents.
    `,
    examples: [
      ['Verify a key', '$0 api-key verify macts_sk_eyJ...'],
      ['Output as JSON', '$0 api-key verify macts_sk_eyJ... --json'],
    ],
  })

  token = Option.String({ required: true, name: 'token' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const result = await validateApiKey(this.token)

      if (this.json) {
        if (result.valid) {
          this.context.stdout.write(
            formatter.format({
              valid: true,
              keyId: result.payload.sub,
              name: result.payload.name ?? null,
              permissions: result.payload.permissions,
              issuedAt: new Date(result.payload.iat * 1000).toISOString(),
              expiresAt: result.payload.exp
                ? new Date(result.payload.exp * 1000).toISOString()
                : null,
            }) + '\n'
          )
        } else {
          this.context.stdout.write(
            formatter.format({
              valid: false,
              error: result.error,
              errorCode: result.errorCode,
            }) + '\n'
          )
        }
      } else {
        if (result.valid) {
          this.context.stdout.write('\n')
          this.context.stdout.write('Key is valid\n\n')
          this.context.stdout.write(`Key ID: ${result.payload.sub}\n`)
          if (result.payload.name) {
            this.context.stdout.write(`Name: ${result.payload.name}\n`)
          }
          this.context.stdout.write(
            `Issued: ${new Date(result.payload.iat * 1000).toISOString()}\n`
          )
          if (result.payload.exp) {
            const expiresAt = new Date(result.payload.exp * 1000)
            const isExpired = expiresAt < new Date()
            this.context.stdout.write(
              `Expires: ${expiresAt.toISOString()}${isExpired ? ' (EXPIRED)' : ''}\n`
            )
          } else {
            this.context.stdout.write('Expires: Never\n')
          }
          this.context.stdout.write('\nPermissions:\n')
          for (const perm of result.payload.permissions) {
            this.context.stdout.write(`  - ${perm}\n`)
          }
        } else {
          this.context.stderr.write(formatter.formatError(`Invalid key: ${result.error}`) + '\n')

          // Try to extract info even from invalid token for debugging
          const keyId = extractKeyIdFromToken(this.token)
          const perms = extractPermissionsFromToken(this.token)
          if (keyId || perms) {
            this.context.stderr.write('\nExtracted from token (unverified):\n')
            if (keyId) this.context.stderr.write(`  Key ID: ${keyId}\n`)
            if (perms) this.context.stderr.write(`  Permissions: ${perms.join(', ')}\n`)
          }

          return 1
        }
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

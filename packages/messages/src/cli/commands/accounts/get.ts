import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a account by ID.
 */
export class GetAccountCommand extends Command {
  static override paths = [['messages', 'accounts', 'get']]

  static override usage = Command.Usage({
    description: 'Get a account by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  accountId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.accounts.get(this.accountId)

      const output = formatter.format({
        id: item.id,
        description: item.description,
        enabled: item.enabled,
        connectionStatus: item.connectionStatus,
        serviceType: item.serviceType,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get an account by name.
 */
export class GetAccountCommand extends Command {
  static override paths = [['notes', 'accounts', 'get']]

  static override usage = Command.Usage({
    description: 'Get an account by name',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  accountId = Option.String({ name: 'name', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.accounts.get(this.accountId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        upgraded: item.upgraded,
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

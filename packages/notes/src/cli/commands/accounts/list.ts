import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List accounts.
 */
export class ListAccountsCommand extends Command {
  static override paths = [['notes', 'accounts', 'list']]

  static override usage = Command.Usage({
    description: 'List accounts',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.accounts.list()

      const output = formatter.formatList(
        page.items.map((item) => ({
          name: item.name,
          id: item.id,
          upgraded: item.upgraded,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

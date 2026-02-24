import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List lists.
 */
export class ListListsCommand extends Command {
  static override paths = [['reminders', 'lists', 'list']]

  static override usage = Command.Usage({
    description: 'List lists',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.lists.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          id: item.id,
          color: item.color,
          emblem: item.emblem,
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

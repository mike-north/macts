import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a list by ID.
 */
export class GetListCommand extends Command {
  static override paths = [['reminders', 'lists', 'get']]

  static override usage = Command.Usage({
    description: 'Get a list by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  listId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.lists.get(this.listId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        color: item.color,
        emblem: item.emblem,
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

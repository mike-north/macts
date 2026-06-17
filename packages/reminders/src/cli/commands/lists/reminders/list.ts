import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List reminders.
 */
export class ListRemindersCommand extends Command {
  static override paths = [['reminders', 'lists', 'reminders', 'list']]

  static override usage = Command.Usage({
    description: 'List reminders',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  listId = Option.String('--list-id', { required: true, description: 'List identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.reminders.list(this.listId)

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          id: item.id,
          body: item.body,
          completed: item.completed,
          completionDate: item.completionDate,
          dueDate: item.dueDate,
          remindMeDate: item.remindMeDate,
          priority: item.priority,
          flagged: item.flagged,
          creationDate: item.creationDate,
          modificationDate: item.modificationDate,
          allDayDueDate: item.allDayDueDate,
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

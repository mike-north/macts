import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List reminders.
 */
export class ListRemindersCommand extends Command {
  static override paths = [['reminders', 'reminders', 'list']]

  static override usage = Command.Usage({
    description: 'List reminders',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  listId = Option.String('--list-id', { required: true, description: 'List identifier' })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.reminders.list(this.listId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
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
          alldayDueDate: item.alldayDueDate,
        })),
        page.nextCursor
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

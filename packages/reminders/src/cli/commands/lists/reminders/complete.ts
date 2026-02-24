import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Mark a reminder as complete
 */
export class CompleteReminderCommand extends Command {
  static override paths = [['reminders', 'lists', 'reminders', 'complete']]

  static override usage = Command.Usage({
    description: 'Mark a reminder as complete',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  listId = Option.String('--list-id', { required: true, description: 'List ID' })

  reminderId = Option.String({ required: true })
  id = Option.String('--id', { required: true, description: 'Reminder identifier' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.reminders.complete(this.id as unknown)

      const output = formatter.formatSuccess('complete completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

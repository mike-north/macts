import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new reminder.
 */
export class CreateReminderCommand extends Command {
  static override paths = [['reminders', 'lists', 'reminders', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new reminder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  listId = Option.String('--list-id', { required: true, description: 'List ID' })
  name = Option.String('--name', { required: true, description: 'The name of the reminder' })
  body = Option.String('--body', {
    required: true,
    description: 'The notes attached to the reminder',
  })
  completed = Option.Boolean('--completed', { description: 'Whether the reminder is completed' })
  dueDate = Option.String('--due-date', {
    required: true,
    description: 'The due date of the reminder',
  })
  remindMeDate = Option.String('--remind-me-date', {
    required: true,
    description: 'The remind date of the reminder',
  })
  priority = Option.String('--priority', {
    required: true,
    description: 'The priority of the reminder (0=none, 1=high, 5=medium, 9=low)',
  })
  flagged = Option.Boolean('--flagged', { description: 'Whether the reminder is flagged' })
  allDayDueDate = Option.String('--all-day-due-date', {
    required: true,
    description: 'The all-day due date of the reminder',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.reminders.create({
        name: this.name,
        body: this.body,
        completed: this.completed,
        dueDate: this.dueDate,
        remindMeDate: this.remindMeDate,
        priority: this.priority,
        flagged: this.flagged,
        allDayDueDate: this.allDayDueDate,
      } as unknown as Parameters<typeof client.reminders.create>[0])

      const output = formatter.format({
        message: 'Reminder created successfully',
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

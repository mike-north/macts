import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new openfilealarm.
 */
export class CreateOpenFileAlarmCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'openFileAlarms', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new openfilealarm',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' })
  triggerInterval = Option.String('--trigger-interval', {
    required: true,
    description:
      'The interval in minutes between the event and the alarm (positive for after, negative for before)',
  })
  triggerDate = Option.String('--trigger-date', {
    required: true,
    description: 'An absolute alarm date',
  })
  filepath = Option.String('--filepath', {
    required: true,
    description: 'The (POSIX) path to be opened by the alarm',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.openfilealarms.create({
        triggerInterval: this.triggerInterval,
        triggerDate: this.triggerDate,
        filepath: this.filepath,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'OpenFileAlarm created successfully',
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
        filepath: item.filepath,
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

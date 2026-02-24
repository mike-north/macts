import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new displayalarm.
 */
export class CreateDisplayAlarmCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'displayAlarms', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new displayalarm',
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

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.displayalarms.create({
        triggerInterval: this.triggerInterval,
        triggerDate: this.triggerDate,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'DisplayAlarm created successfully',
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
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

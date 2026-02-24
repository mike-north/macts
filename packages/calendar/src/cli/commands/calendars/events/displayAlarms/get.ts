import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a displayalarm by ID.
 */
export class GetDisplayAlarmCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'displayAlarms', 'get']]

  static override usage = Command.Usage({
    description: 'Get a displayalarm by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' })

  displayAlarmId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.displayalarms.get(this.displayAlarmId)

      const output = formatter.format({
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

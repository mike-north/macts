import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List attendees.
 */
export class ListAttendeesCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'attendees', 'list']]

  static override usage = Command.Usage({
    description: 'List attendees',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.attendees.list()

      const output = formatter.formatList(
        items.map((item) => ({
          displayName: item.displayName,
          email: item.email,
          participationStatus: item.participationStatus,
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

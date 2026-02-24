import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a attendee by ID.
 */
export class GetAttendeeCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'attendees', 'get']]

  static override usage = Command.Usage({
    description: 'Get a attendee by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' })

  attendeeId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.attendees.get(this.attendeeId)

      const output = formatter.format({
        displayName: item.displayName,
        email: item.email,
        participationStatus: item.participationStatus,
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

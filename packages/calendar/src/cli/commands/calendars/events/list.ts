import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List events.
 */
export class ListEventsCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'list']]

  static override usage = Command.Usage({
    description:
      "List events. When several calendars share the same name, the first match in the app's order is used as the calendar.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', {
    required: true,
    description: 'Calendar identifier',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.events.list(this.calendarId)

      const output = formatter.formatList(
        page.items.map((item) => ({
          summary: item.summary,
          description: item.description,
          location: item.location,
          startDate: item.startDate,
          endDate: item.endDate,
          alldayEvent: item.alldayEvent,
          recurrence: item.recurrence,
          status: item.status,
          sequence: item.sequence,
          stampDate: item.stampDate,
          excludedDates: item.excludedDates,
          uid: item.uid,
          url: item.url,
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

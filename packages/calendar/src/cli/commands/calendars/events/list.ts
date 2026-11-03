import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List events.
 */
export class ListEventsCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'list']]

  static override usage = Command.Usage({
    description: 'List events',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', {
    required: true,
    description: 'Calendar identifier',
  })
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
      const page = await client.events.list(this.calendarId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
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

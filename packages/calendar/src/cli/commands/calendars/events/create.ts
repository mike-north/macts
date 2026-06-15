import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new event.
 */
export class CreateEventCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new event',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  summary = Option.String('--summary', { required: true, description: 'The event summary/title' })
  description = Option.String('--description', { required: true, description: 'The event notes' })
  location = Option.String('--location', { required: true, description: 'The event location' })
  startDate = Option.String('--start-date', { required: true, description: 'The event start date' })
  endDate = Option.String('--end-date', { required: true, description: 'The event end date' })
  alldayEvent = Option.Boolean('--allday-event', {
    description: 'True if the event is an all-day event',
  })
  recurrence = Option.String('--recurrence', {
    required: true,
    description: 'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
  })
  status = Option.String('--status', {
    required: true,
    description: 'The event status',
    validator: t.isEnum(['cancelled', 'confirmed', 'none', 'tentative']),
  })
  stampDate = Option.String('--stamp-date', {
    required: true,
    description: 'The event modification date',
  })
  excludedDates = Option.String('--excluded-dates', {
    required: true,
    description: 'The exception dates for recurring events',
  })
  url = Option.String('--url', { required: true, description: 'The URL associated with the event' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.events.create({
        summary: this.summary,
        description: this.description,
        location: this.location,
        startDate: this.startDate,
        endDate: this.endDate,
        alldayEvent: this.alldayEvent,
        recurrence: this.recurrence,
        status: this.status,
        stampDate: this.stampDate,
        excludedDates: this.excludedDates,
        url: this.url,
      } as unknown as Parameters<typeof client.events.create>[0])

      const output = formatter.format({
        message: 'Event created successfully',
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

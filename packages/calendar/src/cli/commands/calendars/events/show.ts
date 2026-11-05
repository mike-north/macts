import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Show the event or to-do in the calendar window
 */
export class ShowEventCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'show']]

  static override usage = Command.Usage({
    description: 'Show the event or to-do in the calendar window',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', {
    required: true,
    description: 'Calendar identifier (the calendar containing the event)',
  })
  eventId = Option.String({ name: 'uid', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.events.show(
        this.calendarId as unknown as Parameters<typeof client.events.show>[0],
        this.eventId as unknown as Parameters<typeof client.events.show>[1]
      )

      const output = formatter.formatSuccess('show completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new mailalarm.
 */
export class CreateMailAlarmCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'mailAlarms', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new mailalarm',
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
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.mailalarms.create({
        triggerInterval: this.triggerInterval,
        triggerDate: this.triggerDate,
      } as unknown as Parameters<typeof client.mailalarms.create>[0])

      const output = formatter.format({
        message: 'MailAlarm created successfully',
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

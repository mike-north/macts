import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new calendar.
 */
export class CreateCalendarCommand extends Command {
  static override paths = [['calendar', 'calendars', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new calendar',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The calendar title' })
  title = Option.String('--title', {
    required: true,
    description: 'The calendar title (synonym for name)',
  })
  color = Option.String('--color', { required: true, description: 'The calendar color' })
  description = Option.String('--description', {
    required: true,
    description: 'The calendar description',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.calendars.create({
        name: this.name,
        title: this.title,
        color: this.color,
        description: this.description,
      } as unknown as Parameters<typeof client.calendars.create>[0])

      const output = formatter.format({
        message: 'Calendar created successfully',
        name: item.name,
        title: item.title,
        color: item.color,
        calendarIdentifier: item.calendarIdentifier,
        writable: item.writable,
        description: item.description,
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

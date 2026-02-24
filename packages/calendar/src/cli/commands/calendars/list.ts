import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List calendars.
 */
export class ListCalendarsCommand extends Command {
  static override paths = [['calendar', 'calendars', 'list']]

  static override usage = Command.Usage({
    description: 'List calendars',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.calendars.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          title: item.title,
          color: item.color,
          calendarIdentifier: item.calendarIdentifier,
          writable: item.writable,
          description: item.description,
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

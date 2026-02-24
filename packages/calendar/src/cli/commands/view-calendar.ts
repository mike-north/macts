import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Show calendar on the given date
 */
export class ViewCalendarCommand extends Command {
  static override paths = [['calendar', 'view-calendar']]

  static override usage = Command.Usage({
    description: 'Show calendar on the given date',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  at = Option.String('--at', { required: true, description: 'The date to be displayed' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.viewCalendar(this.at as unknown)

      const output = formatter.formatSuccess('viewCalendar completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

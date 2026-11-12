import { Command, Option } from 'clipanion'
import { MactsError } from '@macts/contracts'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Complete a reminder with a property-backed convenience that sets completed to true
 */
export class CompleteReminderCommand extends Command {
  static override paths = [['reminders', 'lists', 'reminders', 'complete']]

  static override usage = Command.Usage({
    description:
      'Complete a reminder with a property-backed convenience that sets completed to true',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  reminderId = Option.String({ name: 'id', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.reminders.complete(
        this.reminderId as unknown as Parameters<typeof client.reminders.complete>[0]
      )

      const output = formatter.formatSuccess('complete completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const failure =
        error instanceof MactsError ? error : error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(failure) + '\n')
      return 1
    }
  }
}

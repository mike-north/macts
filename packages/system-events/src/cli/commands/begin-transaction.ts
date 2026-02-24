import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Begin a bounded update session with one or more files.
 */
export class BeginTransactionCommand extends Command {
  static override paths = [['system-events', 'begin-transaction']]

  static override usage = Command.Usage({
    description: 'Begin a bounded update session with one or more files.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.beginTransaction()

      const output = formatter.formatSuccess('beginTransaction completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

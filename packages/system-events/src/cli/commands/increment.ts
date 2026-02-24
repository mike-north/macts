import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * cause the target process to behave as if the UI element were incremented
 */
export class IncrementCommand extends Command {
  static override paths = [['system-events', 'increment']]

  static override usage = Command.Usage({
    description: 'cause the target process to behave as if the UI element were incremented',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.increment()

      const output = formatter.formatSuccess('increment completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * cause the target process to behave as if keys were released
 */
export class KeyUpCommand extends Command {
  static override paths = [['system-events', 'key-up']]

  static override usage = Command.Usage({
    description: 'cause the target process to behave as if keys were released',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.keyUp()

      const output = formatter.formatSuccess('keyUp completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

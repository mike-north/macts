import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Synchronizes with the shared OmniFocus sync database
 */
export class SynchronizeCommand extends Command {
  static override paths = [['omnifocus', 'synchronize']]

  static override usage = Command.Usage({
    description: 'Synchronizes with the shared OmniFocus sync database',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.synchronize()

      const output = formatter.formatSuccess('synchronize completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

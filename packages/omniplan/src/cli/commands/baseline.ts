import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Commit the current schedule as the baseline schedule
 */
export class BaselineCommand extends Command {
  static override paths = [['omniplan', 'baseline']]

  static override usage = Command.Usage({
    description: 'Commit the current schedule as the baseline schedule',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.baseline()

      const output = formatter.formatSuccess('baseline completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

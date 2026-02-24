import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Step the movie forward the specified number of steps (default is 1).
 */
export class StepForwardCommand extends Command {
  static override paths = [['quicktime-player', 'step-forward']]

  static override usage = Command.Usage({
    description: 'Step the movie forward the specified number of steps (default is 1).',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  by = Option.String('--by', { required: false, description: 'number of steps' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.stepForward(this.by as unknown)

      const output = formatter.formatSuccess('stepForward completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

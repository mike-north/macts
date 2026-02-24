import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Execute a piece of javascript.
 */
export class ExecuteCommand extends Command {
  static override paths = [['arc', 'execute']]

  static override usage = Command.Usage({
    description: 'Execute a piece of javascript.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  javascript = Option.String('--javascript', {
    required: true,
    description: 'The javascript code to execute.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.execute(this.javascript as unknown)

      const output = formatter.formatSuccess('execute completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

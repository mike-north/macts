import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Returns the value of a session variable with the given name
 */
export class VariableCommand extends Command {
  static override paths = [['iterm', 'variable']]

  static override usage = Command.Usage({
    description: 'Returns the value of a session variable with the given name',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  named = Option.String('--named', { required: true, description: 'Name of variable' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.variable(this.named as unknown)

      const output = formatter.formatSuccess('variable completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

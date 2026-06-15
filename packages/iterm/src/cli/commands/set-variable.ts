import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Sets the value of a session variable
 */
export class SetVariableCommand extends Command {
  static override paths = [['iterm', 'set-variable']]

  static override usage = Command.Usage({
    description: 'Sets the value of a session variable',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  named = Option.String('--named', { required: true, description: 'Name of variable' })
  to = Option.String('--to', { required: true, description: 'New value' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.setVariable(
        this.named as unknown as Parameters<typeof client.setVariable>[0],
        this.to as unknown as Parameters<typeof client.setVariable>[1]
      )

      const output = formatter.formatSuccess('setVariable completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

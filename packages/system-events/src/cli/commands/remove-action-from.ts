import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Remove a folder action from a folder
 */
export class RemoveActionFromCommand extends Command {
  static override paths = [['system-events', 'remove-action-from']]

  static override usage = Command.Usage({
    description: 'Remove a folder action from a folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  usingActionName = Option.String('--using-action-name', {
    required: false,
    description: '...or the name of the action to remove',
  })
  usingActionNumber = Option.String('--using-action-number', {
    required: false,
    description: 'the index number of the action to remove...',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.removeActionFrom(
        this.usingActionName as unknown,
        this.usingActionNumber as unknown
      )

      const output = formatter.formatSuccess('removeActionFrom completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

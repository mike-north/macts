import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Remove an Automator action or variable from a workflow
 */
export class RemoveCommand extends Command {
  static override paths = [['automator', 'remove']]

  static override usage = Command.Usage({
    description: 'Remove an Automator action or variable from a workflow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  object = Option.String('--object', {
    required: true,
    description: 'The Automator action or variable to remove',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.remove(this.object as unknown)

      const output = formatter.formatSuccess('remove completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

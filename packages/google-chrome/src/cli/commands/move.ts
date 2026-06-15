import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Move object(s) to a new location.
 */
export class MoveCommand extends Command {
  static override paths = [['google-chrome', 'move']]

  static override usage = Command.Usage({
    description: 'Move object(s) to a new location.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  to = Option.String('--to', { required: true, description: 'The new location for the object(s).' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.move(this.to as unknown as Parameters<typeof client.move>[0])

      const output = formatter.formatSuccess('move completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

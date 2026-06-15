import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Create a new album or folder
 */
export class MakeCommand extends Command {
  static override paths = [['photos', 'make']]

  static override usage = Command.Usage({
    description: 'Create a new album or folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  new = Option.String('--new', {
    required: true,
    description: 'The class of the new object (album or folder)',
  })
  named = Option.String('--named', { required: false, description: 'The name of the new object' })
  at = Option.String('--at', {
    required: false,
    description: 'The parent folder for the new object',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.make(
        this.new as unknown as Parameters<typeof client.make>[0],
        this.named as unknown as Parameters<typeof client.make>[1],
        this.at as unknown as Parameters<typeof client.make>[2]
      )

      const output = formatter.formatSuccess('make completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

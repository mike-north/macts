import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Make a new element
 */
export class MakeCommand extends Command {
  static override paths = [['finder', 'make']]

  static override usage = Command.Usage({
    description: 'Make a new element',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  new = Option.String('--new', { required: true, description: 'the class of the new element' })
  at = Option.String('--at', {
    required: true,
    description: 'the location at which to insert the element',
  })
  to = Option.String('--to', {
    required: false,
    description:
      'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description: 'the initial values for the properties of the element',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.make(
        this.new as unknown as Parameters<typeof client.make>[0],
        this.at as unknown as Parameters<typeof client.make>[1],
        this.to as unknown as Parameters<typeof client.make>[2],
        this.withProperties as unknown as Parameters<typeof client.make>[3]
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

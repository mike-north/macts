import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Make a new object.
 */
export class MakeCommand extends Command {
  static override paths = [['google-chrome', 'make']]

  static override usage = Command.Usage({
    description: 'Make a new object.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  new = Option.String('--new', { required: true, description: 'The class of the new object.' })
  at = Option.String('--at', {
    required: false,
    description: 'The location at which to insert the object.',
  })
  withData = Option.String('--with-data', {
    required: false,
    description: 'The initial contents of the object.',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description: 'The initial values for properties of the object.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.make(
        this.new as unknown as Parameters<typeof client.make>[0],
        this.at as unknown as Parameters<typeof client.make>[1],
        this.withData as unknown as Parameters<typeof client.make>[2],
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

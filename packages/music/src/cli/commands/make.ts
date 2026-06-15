import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Make a new element
 */
export class MakeCommand extends Command {
  static override paths = [['music', 'make']]

  static override usage = Command.Usage({
    description: 'Make a new element',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  new = Option.String('--new', {
    required: true,
    description: "the class of the new element. Keyword 'new' is optional in AppleScript",
  })
  at = Option.String('--at', {
    required: false,
    description: 'the location at which to insert the element',
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
        this.withProperties as unknown as Parameters<typeof client.make>[2]
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

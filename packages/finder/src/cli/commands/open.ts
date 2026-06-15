import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Open the specified object(s)
 */
export class OpenCommand extends Command {
  static override paths = [['finder', 'open']]

  static override usage = Command.Usage({
    description: 'Open the specified object(s)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  using = Option.String('--using', {
    required: false,
    description: 'the application file to open the object with',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description:
      'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.open(
        this.using as unknown as Parameters<typeof client.open>[0],
        this.withProperties as unknown as Parameters<typeof client.open>[1]
      )

      const output = formatter.formatSuccess('open completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

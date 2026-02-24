import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Print the specified object(s)
 */
export class PrintCommand extends Command {
  static override paths = [['finder', 'print']]

  static override usage = Command.Usage({
    description: 'Print the specified object(s)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  withProperties = Option.String('--with-properties', {
    required: false,
    description:
      'optional properties to be included with the print command sent to the application that prints the direct object',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.print(this.withProperties as unknown)

      const output = formatter.formatSuccess('print completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

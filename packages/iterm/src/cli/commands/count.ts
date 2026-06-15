import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Return the number of elements of a particular class within an object.
 */
export class CountCommand extends Command {
  static override paths = [['iterm', 'count']]

  static override usage = Command.Usage({
    description: 'Return the number of elements of a particular class within an object.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  each = Option.String('--each', {
    required: false,
    description: 'The class of objects to be counted.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.count(this.each as unknown as Parameters<typeof client.count>[0])

      const output = formatter.formatSuccess('count completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)
 */
export class CleanUpCommand extends Command {
  static override paths = [['finder', 'clean-up']]

  static override usage = Command.Usage({
    description:
      'Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  by = Option.String('--by', {
    required: false,
    description: 'the order in which to clean up the objects (name, index, date, etc.)',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.cleanUp(this.by as unknown as Parameters<typeof client.cleanUp>[0])

      const output = formatter.formatSuccess('cleanUp completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Slide graphics by a vector amount
 */
export class SlideCommand extends Command {
  static override paths = [['omnigraffle', 'slide']]

  static override usage = Command.Usage({
    description: 'Slide graphics by a vector amount',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  by = Option.String('--by', { required: true, description: 'Vector to slide by' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.slide(this.by as unknown as Parameters<typeof client.slide>[0])

      const output = formatter.formatSuccess('slide completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

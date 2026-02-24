import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * End the currently-playing slideshow
 */
export class StopSlideshowCommand extends Command {
  static override paths = [['photos', 'stop-slideshow']]

  static override usage = Command.Usage({
    description: 'End the currently-playing slideshow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.stopSlideshow()

      const output = formatter.formatSuccess('stopSlideshow completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

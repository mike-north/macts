import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * toggle the playing/paused state of the current track
 */
export class PlaypauseCommand extends Command {
  static override paths = [['tv', 'playpause']]

  static override usage = Command.Usage({
    description: 'toggle the playing/paused state of the current track',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.playpause()

      const output = formatter.formatSuccess('playpause completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Skip to the previous track.
 */
export class PreviousTrackCommand extends Command {
  static override paths = [['spotify', 'previous-track']]

  static override usage = Command.Usage({
    description: 'Skip to the previous track.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.previousTrack()

      const output = formatter.formatSuccess('previousTrack completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

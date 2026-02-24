import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * play the current track or the specified track or file.
 */
export class PlayCommand extends Command {
  static override paths = [['tv', 'play']]

  static override usage = Command.Usage({
    description: 'play the current track or the specified track or file.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  once = Option.Boolean('--once', { description: 'If true, play this track once and then stop.' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.play(this.once as unknown)

      const output = formatter.formatSuccess('play completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a videowindow by ID.
 */
export class GetVideoWindowCommand extends Command {
  static override paths = [['tv', 'videoWindows', 'get']]

  static override usage = Command.Usage({
    description: 'Get a videowindow by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  videoWindowId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.videowindows.get(this.videoWindowId)

      const output = formatter.format({
        id: item.id,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

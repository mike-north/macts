import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a playlistwindow by ID.
 */
export class GetPlaylistWindowCommand extends Command {
  static override paths = [['music', 'playlistWindows', 'get']]

  static override usage = Command.Usage({
    description: 'Get a playlistwindow by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  playlistWindowId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.playlistwindows.get(this.playlistWindowId)

      const output = formatter.format({
        selection: item.selection,
        view: item.view,
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

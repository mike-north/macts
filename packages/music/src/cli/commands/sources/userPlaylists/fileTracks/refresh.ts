import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * update file track information from the current information in the track’s file. macts does not yet send the file track to the app, so the app acts on whatever it chooses.
 */
export class RefreshFileTrackCommand extends Command {
  static override paths = [['music', 'sources', 'userPlaylists', 'fileTracks', 'refresh']]

  static override usage = Command.Usage({
    description:
      'update file track information from the current information in the track’s file. macts does not yet send the file track to the app, so the app acts on whatever it chooses.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.fileTracks.refresh()

      const output = formatter.formatSuccess('refresh completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

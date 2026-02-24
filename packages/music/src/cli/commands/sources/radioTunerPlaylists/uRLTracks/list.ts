import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List urltracks.
 */
export class ListURLTracksCommand extends Command {
  static override paths = [['music', 'sources', 'radioTunerPlaylists', 'uRLTracks', 'list']]

  static override usage = Command.Usage({
    description: 'List urltracks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  radioTunerPlaylistId = Option.String('--radio-tuner-playlist-id', {
    required: true,
    description: 'RadioTunerPlaylist ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.urltracks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          address: item.address,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List audiocdtracks.
 */
export class ListAudioCDTracksCommand extends Command {
  static override paths = [['music', 'sources', 'audioCDPlaylists', 'audioCDTracks', 'list']]

  static override usage = Command.Usage({
    description: 'List audiocdtracks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  audioCDPlaylistId = Option.String('--audio-cdplaylist-id', {
    required: true,
    description: 'AudioCDPlaylist ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.audiocdtracks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          location: item.location,
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

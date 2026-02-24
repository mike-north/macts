import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * update file track information from the current information in the track’s file
 */
export class RefreshFileTrackCommand extends Command {
  static override paths = [['music', 'sources', 'libraryPlaylists', 'fileTracks', 'refresh']]

  static override usage = Command.Usage({
    description: 'update file track information from the current information in the track’s file',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  libraryPlaylistId = Option.String('--library-playlist-id', {
    required: true,
    description: 'LibraryPlaylist ID',
  })

  fileTrackId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.filetracks.refresh()

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

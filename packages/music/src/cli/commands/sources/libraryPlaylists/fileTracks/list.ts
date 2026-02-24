import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List filetracks.
 */
export class ListFileTracksCommand extends Command {
  static override paths = [['music', 'sources', 'libraryPlaylists', 'fileTracks', 'list']]

  static override usage = Command.Usage({
    description: 'List filetracks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  libraryPlaylistId = Option.String('--library-playlist-id', {
    required: true,
    description: 'LibraryPlaylist ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.filetracks.list()

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

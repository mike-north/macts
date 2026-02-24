import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List artworks.
 */
export class ListArtworksCommand extends Command {
  static override paths = [['tv', 'sources', 'playlists', 'artworks', 'list']]

  static override usage = Command.Usage({
    description: 'List artworks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  playlistId = Option.String('--playlist-id', { required: true, description: 'Playlist ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.artworks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          data: item.data,
          description: item.description,
          downloaded: item.downloaded,
          format: item.format,
          kind: item.kind,
          rawData: item.rawData,
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

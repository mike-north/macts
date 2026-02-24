import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List tracks.
 */
export class ListTracksCommand extends Command {
  static override paths = [['spotify', 'currentTrack', 'list']]

  static override usage = Command.Usage({
    description: 'List tracks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.tracks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          artist: item.artist,
          album: item.album,
          albumArtist: item.albumArtist,
          discNumber: item.discNumber,
          duration: item.duration,
          playedCount: item.playedCount,
          trackNumber: item.trackNumber,
          spotifyUrl: item.spotifyUrl,
          id: item.id,
          artworkUrl: item.artworkUrl,
          artwork: item.artwork,
          playerState: item.playerState,
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

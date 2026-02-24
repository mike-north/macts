import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List tracks.
 */
export class ListTracksCommand extends Command {
  static override paths = [['tv', 'sources', 'playlists', 'tracks', 'list']]

  static override usage = Command.Usage({
    description: 'List tracks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  playlistId = Option.String('--playlist-id', { required: true, description: 'Playlist ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.tracks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          album: item.album,
          albumRating: item.albumRating,
          albumRatingKind: item.albumRatingKind,
          bitRate: item.bitRate,
          bookmark: item.bookmark,
          bookmarkable: item.bookmarkable,
          category: item.category,
          comment: item.comment,
          databaseID: item.databaseID,
          dateAdded: item.dateAdded,
          description: item.description,
          director: item.director,
          discCount: item.discCount,
          discNumber: item.discNumber,
          downloaderAccount: item.downloaderAccount,
          downloaderName: item.downloaderName,
          duration: item.duration,
          enabled: item.enabled,
          episodeID: item.episodeID,
          episodeNumber: item.episodeNumber,
          finish: item.finish,
          genre: item.genre,
          grouping: item.grouping,
          kind: item.kind,
          longDescription: item.longDescription,
          mediaKind: item.mediaKind,
          modificationDate: item.modificationDate,
          playedCount: item.playedCount,
          playedDate: item.playedDate,
          purchaserAccount: item.purchaserAccount,
          purchaserName: item.purchaserName,
          rating: item.rating,
          ratingKind: item.ratingKind,
          releaseDate: item.releaseDate,
          sampleRate: item.sampleRate,
          seasonNumber: item.seasonNumber,
          skippedCount: item.skippedCount,
          skippedDate: item.skippedDate,
          show: item.show,
          sortAlbum: item.sortAlbum,
          sortDirector: item.sortDirector,
          sortName: item.sortName,
          sortShow: item.sortShow,
          size: item.size,
          start: item.start,
          time: item.time,
          trackCount: item.trackCount,
          trackNumber: item.trackNumber,
          unplayed: item.unplayed,
          volumeAdjustment: item.volumeAdjustment,
          year: item.year,
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

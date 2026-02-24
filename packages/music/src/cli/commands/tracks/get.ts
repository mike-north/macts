import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a track by ID.
 */
export class GetTrackCommand extends Command {
  static override paths = [["music", "tracks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a track by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  trackId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tracks.get(this.trackId);

      const output = formatter.format({
        album: item.album,
        albumArtist: item.albumArtist,
        albumDisliked: item.albumDisliked,
        albumFavorited: item.albumFavorited,
        albumRating: item.albumRating,
        albumRatingKind: item.albumRatingKind,
        artist: item.artist,
        bitRate: item.bitRate,
        bookmark: item.bookmark,
        bookmarkable: item.bookmarkable,
        bpm: item.bpm,
        category: item.category,
        cloudStatus: item.cloudStatus,
        comment: item.comment,
        compilation: item.compilation,
        composer: item.composer,
        databaseID: item.databaseID,
        dateAdded: item.dateAdded,
        description: item.description,
        discCount: item.discCount,
        discNumber: item.discNumber,
        disliked: item.disliked,
        downloaderAccount: item.downloaderAccount,
        downloaderName: item.downloaderName,
        duration: item.duration,
        enabled: item.enabled,
        episodeID: item.episodeID,
        episodeNumber: item.episodeNumber,
        eQ: item.eQ,
        finish: item.finish,
        gapless: item.gapless,
        genre: item.genre,
        grouping: item.grouping,
        kind: item.kind,
        longDescription: item.longDescription,
        favorited: item.favorited,
        lyrics: item.lyrics,
        mediaKind: item.mediaKind,
        modificationDate: item.modificationDate,
        movement: item.movement,
        movementCount: item.movementCount,
        movementNumber: item.movementNumber,
        playedCount: item.playedCount,
        playedDate: item.playedDate,
        purchaserAccount: item.purchaserAccount,
        purchaserName: item.purchaserName,
        rating: item.rating,
        ratingKind: item.ratingKind,
        releaseDate: item.releaseDate,
        sampleRate: item.sampleRate,
        seasonNumber: item.seasonNumber,
        shufflable: item.shufflable,
        skippedCount: item.skippedCount,
        skippedDate: item.skippedDate,
        show: item.show,
        sortAlbum: item.sortAlbum,
        sortArtist: item.sortArtist,
        sortAlbumArtist: item.sortAlbumArtist,
        sortName: item.sortName,
        sortComposer: item.sortComposer,
        sortShow: item.sortShow,
        size: item.size,
        start: item.start,
        time: item.time,
        trackCount: item.trackCount,
        trackNumber: item.trackNumber,
        unplayed: item.unplayed,
        volumeAdjustment: item.volumeAdjustment,
        work: item.work,
        year: item.year,
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

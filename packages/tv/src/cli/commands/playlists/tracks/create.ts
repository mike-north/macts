import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new track.
 */
export class CreateTrackCommand extends Command {
  static override paths = [["tv", "playlists", "tracks", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new track',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  playlistId = Option.String('--playlist-id', { required: true, description: 'Playlist ID' });
  album = Option.String('--album', { required: true, description: "the album name of the track" });
  albumRating = Option.String('--album-rating', { required: true, description: "the rating of the album for this track (0 to 100)" });
  bookmark = Option.String('--bookmark', { required: true, description: "the bookmark time of the track in seconds" });
  bookmarkable = Option.Boolean('--bookmarkable', { description: "is the playback position for this track remembered?" });
  category = Option.String('--category', { required: true, description: "the category of the track" });
  comment = Option.String('--comment', { required: true, description: "freeform notes about the track" });
  description = Option.String('--description', { required: true, description: "the description of the track" });
  director = Option.String('--director', { required: true, description: "the artist/source of the track" });
  discCount = Option.String('--disc-count', { required: true, description: "the total number of discs in the source album" });
  discNumber = Option.String('--disc-number', { required: true, description: "the index of the disc containing this track on the source album" });
  enabled = Option.Boolean('--enabled', { description: "is this track checked for playback?" });
  episodeID = Option.String('--episode-id', { required: true, description: "the episode ID of the track" });
  episodeNumber = Option.String('--episode-number', { required: true, description: "the episode number of the track" });
  finish = Option.String('--finish', { required: true, description: "the stop time of the track in seconds" });
  genre = Option.String('--genre', { required: true, description: "the genre (category) of the track" });
  grouping = Option.String('--grouping', { required: true, description: "the grouping (piece) of the track. Generally used to denote movements within a classical work." });
  longDescription = Option.String('--long-description', { required: true, description: "the long description of the track" });
  mediaKind = Option.String('--media-kind', { required: true, description: "the media kind of the track" });
  playedCount = Option.String('--played-count', { required: true, description: "number of times this track has been played" });
  playedDate = Option.String('--played-date', { required: true, description: "the date and time this track was last played" });
  rating = Option.String('--rating', { required: true, description: "the rating of this track (0 to 100)" });
  seasonNumber = Option.String('--season-number', { required: true, description: "the season number of the track" });
  skippedCount = Option.String('--skipped-count', { required: true, description: "number of times this track has been skipped" });
  skippedDate = Option.String('--skipped-date', { required: true, description: "the date and time this track was last skipped" });
  show = Option.String('--show', { required: true, description: "the show name of the track" });
  sortAlbum = Option.String('--sort-album', { required: true, description: "override string to use for the track when sorting by album" });
  sortDirector = Option.String('--sort-director', { required: true, description: "override string to use for the track when sorting by artist" });
  sortName = Option.String('--sort-name', { required: true, description: "override string to use for the track when sorting by name" });
  sortShow = Option.String('--sort-show', { required: true, description: "override string to use for the track when sorting by show name" });
  start = Option.String('--start', { required: true, description: "the start time of the track in seconds" });
  trackCount = Option.String('--track-count', { required: true, description: "the total number of tracks on the source album" });
  trackNumber = Option.String('--track-number', { required: true, description: "the index of the track on the source album" });
  unplayed = Option.Boolean('--unplayed', { description: "is this track unplayed?" });
  volumeAdjustment = Option.String('--volume-adjustment', { required: true, description: "relative volume adjustment of the track (-100% to 100%)" });
  year = Option.String('--year', { required: true, description: "the year the track was recorded/released" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tracks.create({
        album: this.album,
        albumRating: this.albumRating,
        bookmark: this.bookmark,
        bookmarkable: this.bookmarkable,
        category: this.category,
        comment: this.comment,
        description: this.description,
        director: this.director,
        discCount: this.discCount,
        discNumber: this.discNumber,
        enabled: this.enabled,
        episodeID: this.episodeID,
        episodeNumber: this.episodeNumber,
        finish: this.finish,
        genre: this.genre,
        grouping: this.grouping,
        longDescription: this.longDescription,
        mediaKind: this.mediaKind,
        playedCount: this.playedCount,
        playedDate: this.playedDate,
        rating: this.rating,
        seasonNumber: this.seasonNumber,
        skippedCount: this.skippedCount,
        skippedDate: this.skippedDate,
        show: this.show,
        sortAlbum: this.sortAlbum,
        sortDirector: this.sortDirector,
        sortName: this.sortName,
        sortShow: this.sortShow,
        start: this.start,
        trackCount: this.trackCount,
        trackNumber: this.trackNumber,
        unplayed: this.unplayed,
        volumeAdjustment: this.volumeAdjustment,
        year: this.year,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Track created successfully',
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a track by ID.
 */
export class GetTrackCommand extends Command {
  static override paths = [["spotify", "currentTrack", "get"]];

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

      if (!item) {
        this.context.stderr.write(formatter.formatError('Track not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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

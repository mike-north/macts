import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a audiocdplaylist by ID.
 */
export class GetAudioCDPlaylistCommand extends Command {
  static override paths = [["music", "sources", "audioCDPlaylists", "get"]];

  static override usage = Command.Usage({
    description: 'Get a audiocdplaylist by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });

  audioCDPlaylistId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.audiocdplaylists.get(this.audioCDPlaylistId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('AudioCDPlaylist not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        artist: item.artist,
        compilation: item.compilation,
        composer: item.composer,
        discCount: item.discCount,
        discNumber: item.discNumber,
        genre: item.genre,
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

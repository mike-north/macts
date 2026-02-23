import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new audiocdplaylist.
 */
export class CreateAudioCDPlaylistCommand extends Command {
  static override paths = [["music", "sources", "audioCDPlaylists", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new audiocdplaylist',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  artist = Option.String('--artist', { required: true, description: "the artist of the CD" });
  compilation = Option.Boolean('--compilation', { description: "is this CD a compilation album?" });
  composer = Option.String('--composer', { required: true, description: "the composer of the CD" });
  discCount = Option.String('--disc-count', { required: true, description: "the total number of discs in this CD’s album" });
  discNumber = Option.String('--disc-number', { required: true, description: "the index of this CD disc in the source album" });
  genre = Option.String('--genre', { required: true, description: "the genre of the CD" });
  year = Option.String('--year', { required: true, description: "the year the album was recorded/released" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.audiocdplaylists.create({
        artist: this.artist,
        compilation: this.compilation,
        composer: this.composer,
        discCount: this.discCount,
        discNumber: this.discNumber,
        genre: this.genre,
        year: this.year,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'AudioCDPlaylist created successfully',
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

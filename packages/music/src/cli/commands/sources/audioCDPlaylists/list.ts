import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List audiocdplaylists.
 */
export class ListAudioCDPlaylistsCommand extends Command {
  static override paths = [["music", "sources", "audioCDPlaylists", "list"]];

  static override usage = Command.Usage({
    description: 'List audiocdplaylists',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.audiocdplaylists.list();

      const output = formatter.formatList(items.map(item => ({
        artist: item.artist,
        compilation: item.compilation,
        composer: item.composer,
        discCount: item.discCount,
        discNumber: item.discNumber,
        genre: item.genre,
        year: item.year,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

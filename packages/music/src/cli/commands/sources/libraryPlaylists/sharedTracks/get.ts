import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a sharedtrack by ID.
 */
export class GetSharedTrackCommand extends Command {
  static override paths = [["music", "sources", "libraryPlaylists", "sharedTracks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a sharedtrack by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  libraryPlaylistId = Option.String('--library-playlist-id', { required: true, description: 'LibraryPlaylist ID' });

  sharedTrackId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.sharedtracks.get(this.sharedTrackId);

      const output = formatter.format({
        id: item.id,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a filetrack by ID.
 */
export class GetFileTrackCommand extends Command {
  static override paths = [["tv", "sources", "libraryPlaylists", "fileTracks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a filetrack by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  libraryPlaylistId = Option.String('--library-playlist-id', { required: true, description: 'LibraryPlaylist ID' });

  fileTrackId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.filetracks.get(this.fileTrackId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('FileTrack not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        location: item.location,
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

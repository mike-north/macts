import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a artwork by ID.
 */
export class GetArtworkCommand extends Command {
  static override paths = [["tv", "sources", "playlists", "artworks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a artwork by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  playlistId = Option.String('--playlist-id', { required: true, description: 'Playlist ID' });

  artworkId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.artworks.get(this.artworkId);

      const output = formatter.format({
        id: item.id,
        data: item.data,
        description: item.description,
        downloaded: item.downloaded,
        format: item.format,
        kind: item.kind,
        rawData: item.rawData,
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

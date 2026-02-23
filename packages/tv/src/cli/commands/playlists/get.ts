import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a playlist by ID.
 */
export class GetPlaylistCommand extends Command {
  static override paths = [["tv", "playlists", "get"]];

  static override usage = Command.Usage({
    description: 'Get a playlist by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  playlistId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.playlists.get(this.playlistId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Playlist not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        description: item.description,
        duration: item.duration,
        name: item.name,
        parent: item.parent,
        size: item.size,
        specialKind: item.specialKind,
        time: item.time,
        visible: item.visible,
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

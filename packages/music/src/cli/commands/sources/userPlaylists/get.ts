import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a userplaylist by ID.
 */
export class GetUserPlaylistCommand extends Command {
  static override paths = [["music", "sources", "userPlaylists", "get"]];

  static override usage = Command.Usage({
    description: 'Get a userplaylist by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });

  userPlaylistId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.userplaylists.get(this.userPlaylistId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('UserPlaylist not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        shared: item.shared,
        smart: item.smart,
        genius: item.genius,
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

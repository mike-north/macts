import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List playlists.
 */
export class ListPlaylistsCommand extends Command {
  static override paths = [["tv", "sources", "playlists", "list"]];

  static override usage = Command.Usage({
    description: 'List playlists',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.playlists.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        description: item.description,
        duration: item.duration,
        name: item.name,
        parent: item.parent,
        size: item.size,
        specialKind: item.specialKind,
        time: item.time,
        visible: item.visible,
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

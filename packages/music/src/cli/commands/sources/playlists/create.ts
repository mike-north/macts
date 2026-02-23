import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new playlist.
 */
export class CreatePlaylistCommand extends Command {
  static override paths = [["music", "sources", "playlists", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new playlist',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  description = Option.String('--description', { required: true, description: "the description of the playlist" });
  disliked = Option.Boolean('--disliked', { description: "is this playlist disliked?" });
  name = Option.String('--name', { required: true, description: "the name of the playlist" });
  favorited = Option.Boolean('--favorited', { description: "is this playlist favorited?" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.playlists.create({
        description: this.description,
        disliked: this.disliked,
        name: this.name,
        favorited: this.favorited,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Playlist created successfully',
        description: item.description,
        disliked: item.disliked,
        duration: item.duration,
        name: item.name,
        favorited: item.favorited,
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

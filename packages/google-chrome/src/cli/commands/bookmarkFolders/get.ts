import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a bookmarkfolder by ID.
 */
export class GetBookmarkFolderCommand extends Command {
  static override paths = [["google-chrome", "bookmarkFolders", "get"]];

  static override usage = Command.Usage({
    description: 'Get a bookmarkfolder by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  bookmarkFolderId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.bookmarkfolders.get(this.bookmarkFolderId);

      const output = formatter.format({
        id: item.id,
        title: item.title,
        index: item.index,
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

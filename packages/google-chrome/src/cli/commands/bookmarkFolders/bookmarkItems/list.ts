import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List bookmarkitems.
 */
export class ListBookmarkItemsCommand extends Command {
  static override paths = [["google-chrome", "bookmarkFolders", "bookmarkItems", "list"]];

  static override usage = Command.Usage({
    description: 'List bookmarkitems',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  bookmarkFolderId = Option.String('--bookmark-folder-id', { required: true, description: 'BookmarkFolder ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.bookmarkitems.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        title: item.title,
        uRL: item.uRL,
        index: item.index,
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

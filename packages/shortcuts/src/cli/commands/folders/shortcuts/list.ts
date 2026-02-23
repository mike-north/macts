import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List shortcuts.
 */
export class ListShortcutsCommand extends Command {
  static override paths = [["shortcuts", "folders", "shortcuts", "list"]];

  static override usage = Command.Usage({
    description: 'List shortcuts',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  folderId = Option.String('--folder-id', { required: true, description: 'Folder ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.shortcuts.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        subtitle: item.subtitle,
        id: item.id,
        folder: item.folder,
        color: item.color,
        icon: item.icon,
        acceptsInput: item.acceptsInput,
        actionCount: item.actionCount,
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

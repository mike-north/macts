import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a shortcut by ID.
 */
export class GetShortcutCommand extends Command {
  static override paths = [["shortcuts", "shortcuts", "get"]];

  static override usage = Command.Usage({
    description: 'Get a shortcut by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  shortcutId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.shortcuts.get(this.shortcutId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Shortcut not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        subtitle: item.subtitle,
        id: item.id,
        folder: item.folder,
        color: item.color,
        icon: item.icon,
        acceptsInput: item.acceptsInput,
        actionCount: item.actionCount,
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

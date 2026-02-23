import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List tabs.
 */
export class ListTabsCommand extends Command {
  static override paths = [["iterm", "windows", "tabs", "list"]];

  static override usage = Command.Usage({
    description: 'List tabs',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.tabs.list();

      const output = formatter.formatList(items.map(item => ({
        currentSession: item.currentSession,
        index: item.index,
        title: item.title,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a tab by ID.
 */
export class GetTabCommand extends Command {
  static override paths = [["arc", "tabs", "get"]];

  static override usage = Command.Usage({
    description: 'Get a tab by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  tabId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tabs.get(this.tabId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Tab not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        title: item.title,
        uRL: item.uRL,
        loading: item.loading,
        location: item.location,
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

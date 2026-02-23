import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List chats.
 */
export class ListChatsCommand extends Command {
  static override paths = [["messages", "chats", "list"]];

  static override usage = Command.Usage({
    description: 'List chats',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.chats.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        account: item.account,
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

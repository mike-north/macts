import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List mailboxes.
 */
export class ListMailboxesCommand extends Command {
  static override paths = [["mail", "mailboxes", "list"]];

  static override usage = Command.Usage({
    description: 'List mailboxes',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.mailboxes.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        unreadCount: item.unreadCount,
        account: item.account,
        container: item.container,
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

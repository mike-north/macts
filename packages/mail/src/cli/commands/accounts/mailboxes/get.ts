import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a mailbox by ID.
 */
export class GetMailboxCommand extends Command {
  static override paths = [["mail", "accounts", "mailboxes", "get"]];

  static override usage = Command.Usage({
    description: 'Get a mailbox by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' });

  mailboxId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.mailboxes.get(this.mailboxId);

      const output = formatter.format({
        name: item.name,
        unreadCount: item.unreadCount,
        account: item.account,
        container: item.container,
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

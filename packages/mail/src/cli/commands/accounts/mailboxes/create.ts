import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new mailbox.
 */
export class CreateMailboxCommand extends Command {
  static override paths = [["mail", "accounts", "mailboxes", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new mailbox',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' });
  name = Option.String('--name', { required: true, description: "The name of a mailbox" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.mailboxes.create({
        name: this.name,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Mailbox created successfully',
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

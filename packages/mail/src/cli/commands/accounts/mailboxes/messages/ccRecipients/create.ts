import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../sdk.js';
import { createFormatter } from '../../../../../output/index.js';

/**
 * Create a new ccrecipient.
 */
export class CreateCcRecipientCommand extends Command {
  static override paths = [["mail", "accounts", "mailboxes", "messages", "ccRecipients", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new ccrecipient',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' });
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.ccrecipients.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'CcRecipient created successfully',
        id: item.id,
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

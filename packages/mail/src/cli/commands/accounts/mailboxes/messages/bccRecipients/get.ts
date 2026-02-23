import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../sdk.js';
import { createFormatter } from '../../../../../output/index.js';

/**
 * Get a bccrecipient by ID.
 */
export class GetBccRecipientCommand extends Command {
  static override paths = [["mail", "accounts", "mailboxes", "messages", "bccRecipients", "get"]];

  static override usage = Command.Usage({
    description: 'Get a bccrecipient by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' });
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  bccRecipientId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.bccrecipients.get(this.bccRecipientId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('BccRecipient not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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

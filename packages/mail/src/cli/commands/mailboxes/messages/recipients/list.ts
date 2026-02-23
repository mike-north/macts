import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List recipients.
 */
export class ListRecipientsCommand extends Command {
  static override paths = [["mail", "mailboxes", "messages", "recipients", "list"]];

  static override usage = Command.Usage({
    description: 'List recipients',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.recipients.list();

      const output = formatter.formatList(items.map(item => ({
        address: item.address,
        name: item.name,
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

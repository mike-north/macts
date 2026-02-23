import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../sdk.js';
import { createFormatter } from '../../../../../output/index.js';

/**
 * Create a new header.
 */
export class CreateHeaderCommand extends Command {
  static override paths = [["mail", "accounts", "mailboxes", "messages", "headers", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new header',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' });
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });
  content = Option.String('--content', { required: true, description: "Contents of the header" });
  name = Option.String('--name', { required: true, description: "Name of the header value" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.headers.create({
        content: this.content,
        name: this.name,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Header created successfully',
        content: item.content,
        name: item.name,
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

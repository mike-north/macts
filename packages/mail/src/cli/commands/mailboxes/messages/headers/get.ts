import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a header by ID.
 */
export class GetHeaderCommand extends Command {
  static override paths = [["mail", "mailboxes", "messages", "headers", "get"]];

  static override usage = Command.Usage({
    description: 'Get a header by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  headerId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.headers.get(this.headerId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Header not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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

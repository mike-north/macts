import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new recipient.
 */
export class CreateRecipientCommand extends Command {
  static override paths = [["mail", "outgoingMessages", "recipients", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new recipient',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  outgoingMessageId = Option.String('--outgoing-message-id', { required: true, description: 'OutgoingMessage ID' });
  address = Option.String('--address', { required: true, description: "The recipients email address" });
  name = Option.String('--name', { required: true, description: "The name used for display" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.recipients.create({
        address: this.address,
        name: this.name,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Recipient created successfully',
        address: item.address,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new bccrecipient.
 */
export class CreateBccRecipientCommand extends Command {
  static override paths = [["mail", "outgoingMessages", "bccRecipients", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new bccrecipient',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  outgoingMessageId = Option.String('--outgoing-message-id', { required: true, description: 'OutgoingMessage ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.bccrecipients.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'BccRecipient created successfully',
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

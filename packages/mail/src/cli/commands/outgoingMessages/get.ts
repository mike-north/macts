import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a outgoingmessage by ID.
 */
export class GetOutgoingMessageCommand extends Command {
  static override paths = [["mail", "outgoingMessages", "get"]];

  static override usage = Command.Usage({
    description: 'Get a outgoingmessage by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  outgoingMessageId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.outgoingmessages.get(this.outgoingMessageId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('OutgoingMessage not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        sender: item.sender,
        subject: item.subject,
        visible: item.visible,
        messageSignature: item.messageSignature,
        id: item.id,
        htmlContent: item.htmlContent,
        vcardPath: item.vcardPath,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a ccrecipient by ID.
 */
export class GetCcRecipientCommand extends Command {
  static override paths = [["mail", "messageViewers", "messages", "ccRecipients", "get"]];

  static override usage = Command.Usage({
    description: 'Get a ccrecipient by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  messageViewerId = Option.String('--message-viewer-id', { required: true, description: 'MessageViewer ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  ccRecipientId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.ccrecipients.get(this.ccRecipientId);

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

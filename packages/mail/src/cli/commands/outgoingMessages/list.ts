import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List outgoingmessages.
 */
export class ListOutgoingMessagesCommand extends Command {
  static override paths = [["mail", "outgoingMessages", "list"]];

  static override usage = Command.Usage({
    description: 'List outgoingmessages',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.outgoingmessages.list();

      const output = formatter.formatList(items.map(item => ({
        sender: item.sender,
        subject: item.subject,
        visible: item.visible,
        messageSignature: item.messageSignature,
        id: item.id,
        htmlContent: item.htmlContent,
        vcardPath: item.vcardPath,
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

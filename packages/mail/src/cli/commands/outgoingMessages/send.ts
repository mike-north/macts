import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Sends a message.
 */
export class SendOutgoingMessageCommand extends Command {
  static override paths = [["mail", "outgoingMessages", "send"]];

  static override usage = Command.Usage({
    description: "Sends a message.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  outgoingMessageId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.outgoingmessages.send();

      const output = formatter.formatSuccess('send completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

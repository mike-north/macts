import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Creates a forwarded message.
 */
export class ForwardMessageCommand extends Command {
  static override paths = [["mail", "messageViewers", "messages", "forward"]];

  static override usage = Command.Usage({
    description: "Creates a forwarded message.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  messageViewerId = Option.String('--message-viewer-id', { required: true, description: 'MessageViewer ID' });

  messageId = Option.String({ required: true });
  openingWindow = Option.Boolean('--opening-window', { description: "Whether the window for the forwarded message is shown. Default is to not show the window." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.messages.forward(this.openingWindow as unknown);

      const output = formatter.formatSuccess('forward completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

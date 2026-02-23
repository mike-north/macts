import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Does nothing at all (deprecated)
 */
export class BounceMessageCommand extends Command {
  static override paths = [["mail", "messageViewers", "messages", "bounce"]];

  static override usage = Command.Usage({
    description: "Does nothing at all (deprecated)",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  messageViewerId = Option.String('--message-viewer-id', { required: true, description: 'MessageViewer ID' });

  messageId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.messages.bounce();

      const output = formatter.formatSuccess('bounce completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Send text as though it was typed.
 */
export class WriteCommand extends Command {
  static override paths = [["iterm", "write"]];

  static override usage = Command.Usage({
    description: "Send text as though it was typed.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  contentsOfFile = Option.String('--contents-of-file', { required: false, description: "Filename to send the contents of" });
  text = Option.String('--text', { required: false, description: "Text to send" });
  newline = Option.Boolean('--newline', { description: "If newline should be added to end of text (default: yes)" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.write(this.contentsOfFile as any, this.text as any, this.newline as any);

      const output = formatter.formatSuccess('write completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

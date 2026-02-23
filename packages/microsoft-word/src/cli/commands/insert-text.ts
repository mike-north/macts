import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Insert text at the specified location
 */
export class InsertTextCommand extends Command {
  static override paths = [["microsoft-word", "insert-text"]];

  static override usage = Command.Usage({
    description: "Insert text at the specified location",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  text = Option.String('--text', { required: true, description: "The text to insert" });
  at = Option.String('--at', { required: false, description: "The character position to insert at" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.insertText(this.text as any, this.at as any);

      const output = formatter.formatSuccess('insertText completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

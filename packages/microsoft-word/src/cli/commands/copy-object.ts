import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Copy the selected content to the clipboard
 */
export class CopyObjectCommand extends Command {
  static override paths = [["microsoft-word", "copy-object"]];

  static override usage = Command.Usage({
    description: "Copy the selected content to the clipboard",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.copyObject();

      const output = formatter.formatSuccess('copyObject completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

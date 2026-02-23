import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)
 */
export class CopyCommand extends Command {
  static override paths = [["finder", "copy"]];

  static override usage = Command.Usage({
    description: "(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.copy();

      const output = formatter.formatSuccess('copy completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

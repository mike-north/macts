import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Layout graphics using the document's Layout Info
 */
export class LayoutCommand extends Command {
  static override paths = [["omnigraffle", "layout"]];

  static override usage = Command.Usage({
    description: "Layout graphics using the document's Layout Info",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.layout();

      const output = formatter.formatSuccess('layout completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Hides completed tasks and processes any inbox items
 */
export class CompactCommand extends Command {
  static override paths = [["omnifocus", "compact"]];

  static override usage = Command.Usage({
    description: "Hides completed tasks and processes any inbox items",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.compact();

      const output = formatter.formatSuccess('compact completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

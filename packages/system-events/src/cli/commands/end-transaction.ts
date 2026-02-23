import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Apply the results of a bounded update session with one or more files.
 */
export class EndTransactionCommand extends Command {
  static override paths = [["system-events", "end-transaction"]];

  static override usage = Command.Usage({
    description: "Apply the results of a bounded update session with one or more files.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.endTransaction();

      const output = formatter.formatSuccess('endTransaction completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

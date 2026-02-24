import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Return the size in bytes of an object
 */
export class DataSizeCommand extends Command {
  static override paths = [["finder", "data-size"]];

  static override usage = Command.Usage({
    description: "Return the size in bytes of an object",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  as = Option.String('--as', { required: false, description: "the data type for which the size is calculated" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.dataSize(this.as as unknown);

      const output = formatter.formatSuccess('dataSize completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

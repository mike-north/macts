import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Add a child object.
 */
export class AddCommand extends Command {
  static override paths = [["contacts", "add"]];

  static override usage = Command.Usage({
    description: "Add a child object.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  to = Option.String('--to', { required: true, description: "where to add this child to." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.add(this.to as any);

      const output = formatter.formatSuccess('add completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

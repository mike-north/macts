import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Remove a child object.
 */
export class RemoveCommand extends Command {
  static override paths = [["contacts", "remove"]];

  static override usage = Command.Usage({
    description: "Remove a child object.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  from = Option.String('--from', { required: true, description: "where to remove this child from." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.remove(this.from as unknown);

      const output = formatter.formatSuccess('remove completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

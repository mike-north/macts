import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Return the specified object(s) in a sorted list
 */
export class SortCommand extends Command {
  static override paths = [["finder", "sort"]];

  static override usage = Command.Usage({
    description: "Return the specified object(s) in a sorted list",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  by = Option.String('--by', { required: true, description: "the property to sort the items by (name, index, date, etc.)" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.sort(this.by as unknown);

      const output = formatter.formatSuccess('sort completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

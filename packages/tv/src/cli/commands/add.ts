import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * add one or more files to a playlist
 */
export class AddCommand extends Command {
  static override paths = [["tv", "add"]];

  static override usage = Command.Usage({
    description: "add one or more files to a playlist",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  to = Option.String('--to', { required: false, description: "the location of the added file(s)" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.add(this.to as unknown);

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

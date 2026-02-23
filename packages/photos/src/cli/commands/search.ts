import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Search for items matching the search string
 */
export class SearchCommand extends Command {
  static override paths = [["photos", "search"]];

  static override usage = Command.Usage({
    description: "Search for items matching the search string",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  for = Option.String('--for', { required: true, description: "The text to search for" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.search(this.for as any);

      const output = formatter.formatSuccess('search completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

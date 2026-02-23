import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List yahoohandles.
 */
export class ListYahooHandlesCommand extends Command {
  static override paths = [["contacts", "people", "yahooHandles", "list"]];

  static override usage = Command.Usage({
    description: 'List yahoohandles',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.yahoohandles.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        label: item.label,
        value: item.value,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List eqwindows.
 */
export class ListEQWindowsCommand extends Command {
  static override paths = [["music", "eQWindows", "list"]];

  static override usage = Command.Usage({
    description: 'List eqwindows',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.eqwindows.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
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

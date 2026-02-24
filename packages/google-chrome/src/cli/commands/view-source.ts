import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * View the HTML source of the tab.
 */
export class ViewSourceCommand extends Command {
  static override paths = [["google-chrome", "view-source"]];

  static override usage = Command.Usage({
    description: "View the HTML source of the tab.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.viewSource();

      const output = formatter.formatSuccess('viewSource completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

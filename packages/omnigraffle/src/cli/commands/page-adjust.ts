import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Change the number of pages to fit the current graphics
 */
export class PageAdjustCommand extends Command {
  static override paths = [["omnigraffle", "page-adjust"]];

  static override usage = Command.Usage({
    description: "Change the number of pages to fit the current graphics",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.pageAdjust();

      const output = formatter.formatSuccess('pageAdjust completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

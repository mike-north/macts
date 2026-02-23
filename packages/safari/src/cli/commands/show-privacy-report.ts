import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show Safari's Privacy Report
 */
export class ShowPrivacyReportCommand extends Command {
  static override paths = [["safari", "show-privacy-report"]];

  static override usage = Command.Usage({
    description: "Show Safari's Privacy Report",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.showPrivacyReport();

      const output = formatter.formatSuccess('showPrivacyReport completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Emails the contents of a tab.
 */
export class EmailContentsCommand extends Command {
  static override paths = [["safari", "email-contents"]];

  static override usage = Command.Usage({
    description: "Emails the contents of a tab.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  of = Option.String('--of', { required: false, description: "The tab to send." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.emailContents(this.of as unknown);

      const output = formatter.formatSuccess('emailContents completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

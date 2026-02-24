import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Go Forward (If Possible).
 */
export class GoForwardCommand extends Command {
  static override paths = [["google-chrome", "go-forward"]];

  static override usage = Command.Usage({
    description: "Go Forward (If Possible).",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.goForward();

      const output = formatter.formatSuccess('goForward completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

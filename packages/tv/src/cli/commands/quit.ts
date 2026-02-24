import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Quit the application
 */
export class QuitCommand extends Command {
  static override paths = [["tv", "quit"]];

  static override usage = Command.Usage({
    description: "Quit the application",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.quit();

      const output = formatter.formatSuccess('quit completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

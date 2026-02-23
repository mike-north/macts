import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Empty the trash
 */
export class EmptyCommand extends Command {
  static override paths = [["finder", "empty"]];

  static override usage = Command.Usage({
    description: "Empty the trash",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  security = Option.Boolean('--security', { description: "(obsolete)" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.empty(this.security as any);

      const output = formatter.formatSuccess('empty completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

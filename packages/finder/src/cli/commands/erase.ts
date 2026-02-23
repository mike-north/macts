import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * (NOT AVAILABLE) Erase the specified disk(s)
 */
export class EraseCommand extends Command {
  static override paths = [["finder", "erase"]];

  static override usage = Command.Usage({
    description: "(NOT AVAILABLE) Erase the specified disk(s)",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.erase();

      const output = formatter.formatSuccess('erase completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

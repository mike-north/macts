import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * cause the target process to behave as if keys were held down
 */
export class KeyDownCommand extends Command {
  static override paths = [["system-events", "key-down"]];

  static override usage = Command.Usage({
    description: "cause the target process to behave as if keys were held down",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.keyDown();

      const output = formatter.formatSuccess('keyDown completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

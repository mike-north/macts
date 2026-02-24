import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * cause the target process to behave as if the UI element were confirmed
 */
export class ConfirmCommand extends Command {
  static override paths = [["system-events", "confirm"]];

  static override usage = Command.Usage({
    description: "cause the target process to behave as if the UI element were confirmed",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.confirm();

      const output = formatter.formatSuccess('confirm completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

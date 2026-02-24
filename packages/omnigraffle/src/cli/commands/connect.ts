import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Draw a line between graphics
 */
export class ConnectCommand extends Command {
  static override paths = [["omnigraffle", "connect"]];

  static override usage = Command.Usage({
    description: "Draw a line between graphics",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  from = Option.String('--from', { required: true, description: "Source graphic ID" });
  to = Option.String('--to', { required: true, description: "Destination graphic ID" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.connect(this.from as unknown, this.to as unknown);

      const output = formatter.formatSuccess('connect completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

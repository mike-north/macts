import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Private event to open a virtual location
 */
export class OpenVirtualLocationCommand extends Command {
  static override paths = [["finder", "open-virtual-location"]];

  static override usage = Command.Usage({
    description: "Private event to open a virtual location",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.openVirtualLocation();

      const output = formatter.formatSuccess('openVirtualLocation completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

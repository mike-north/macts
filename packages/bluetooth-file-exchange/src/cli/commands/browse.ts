import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Browse a device
 */
export class BrowseCommand extends Command {
  static override paths = [["bluetooth-file-exchange", "browse"]];

  static override usage = Command.Usage({
    description: "Browse a device",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  device = Option.String('--device', { required: false, description: "The device to browse" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.browse(this.device as unknown);

      const output = formatter.formatSuccess('browse completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

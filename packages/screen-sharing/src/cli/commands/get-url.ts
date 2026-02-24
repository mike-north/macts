import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Open a vnc URL
 */
export class GetURLCommand extends Command {
  static override paths = [["screen-sharing", "get-url"]];

  static override usage = Command.Usage({
    description: "Open a vnc URL",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  url = Option.String('--url', { required: true, description: "The VNC URL to open" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.getURL(this.url as unknown);

      const output = formatter.formatSuccess('getURL completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

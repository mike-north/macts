import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show the image at path in the application
 */
export class SpotlightCommand extends Command {
  static override paths = [["photos", "spotlight"]];

  static override usage = Command.Usage({
    description: "Show the image at path in the application",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  target = Option.String('--target', { required: true, description: "The full path to the image or media item ID" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.spotlight(this.target as any);

      const output = formatter.formatSuccess('spotlight completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

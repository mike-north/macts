import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Add media items to an album
 */
export class AddCommand extends Command {
  static override paths = [["photos", "add"]];

  static override usage = Command.Usage({
    description: "Add media items to an album",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  mediaItems = Option.String('--media-items', { required: true, description: "The list of media items to add" });
  to = Option.String('--to', { required: true, description: "The album to add to" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.add(this.mediaItems as any, this.to as any);

      const output = formatter.formatSuccess('add completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

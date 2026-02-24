import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Duplicate a media item
 */
export class DuplicateMediaItemCommand extends Command {
  static override paths = [["photos", "mediaItems", "duplicate"]];

  static override usage = Command.Usage({
    description: "Duplicate a media item",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  mediaItemId = Option.String({ required: true });
  id = Option.String('--id', { required: true, description: "The media item to duplicate" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.mediaitems.duplicate(this.id as unknown);

      const output = formatter.formatSuccess('duplicate completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

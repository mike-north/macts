import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * advance to the next track in the current playlist
 */
export class NextTrackCommand extends Command {
  static override paths = [["tv", "next-track"]];

  static override usage = Command.Usage({
    description: "advance to the next track in the current playlist",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.nextTrack();

      const output = formatter.formatSuccess('nextTrack completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

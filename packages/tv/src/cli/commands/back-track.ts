import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * reposition to beginning of current track or go to previous track if already at start of current track
 */
export class BackTrackCommand extends Command {
  static override paths = [["tv", "back-track"]];

  static override usage = Command.Usage({
    description: "reposition to beginning of current track or go to previous track if already at start of current track",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.backTrack();

      const output = formatter.formatSuccess('backTrack completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

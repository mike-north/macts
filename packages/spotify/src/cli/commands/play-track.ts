import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Start playback of a track in the given context.
 */
export class PlayTrackCommand extends Command {
  static override paths = [["spotify", "play-track"]];

  static override usage = Command.Usage({
    description: "Start playback of a track in the given context.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  inContext = Option.String('--in-context', { required: false, description: "the URI of the context to play in" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.playTrack(this.inContext as any);

      const output = formatter.formatSuccess('playTrack completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

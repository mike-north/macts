import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Pause the currently-playing slideshow
 */
export class PauseSlideshowCommand extends Command {
  static override paths = [["photos", "pause-slideshow"]];

  static override usage = Command.Usage({
    description: "Pause the currently-playing slideshow",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.pauseSlideshow();

      const output = formatter.formatSuccess('pauseSlideshow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

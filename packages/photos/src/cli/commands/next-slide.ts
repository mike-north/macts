import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Skip to next slide in currently-playing slideshow
 */
export class NextSlideCommand extends Command {
  static override paths = [["photos", "next-slide"]];

  static override usage = Command.Usage({
    description: "Skip to next slide in currently-playing slideshow",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.nextSlide();

      const output = formatter.formatSuccess('nextSlide completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

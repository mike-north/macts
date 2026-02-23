import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Resume the currently-playing slideshow
 */
export class ResumeSlideshowCommand extends Command {
  static override paths = [["photos", "resume-slideshow"]];

  static override usage = Command.Usage({
    description: "Resume the currently-playing slideshow",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.resumeSlideshow();

      const output = formatter.formatSuccess('resumeSlideshow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

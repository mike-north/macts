import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Display an ad-hoc slide show from a list of media items
 */
export class StartSlideshowCommand extends Command {
  static override paths = [["photos", "start-slideshow"]];

  static override usage = Command.Usage({
    description: "Display an ad-hoc slide show from a list of media items",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  using = Option.String('--using', { required: true, description: "The media items to show" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.startSlideshow(this.using as any);

      const output = formatter.formatSuccess('startSlideshow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

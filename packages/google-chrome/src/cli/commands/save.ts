import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Save an object.
 */
export class SaveCommand extends Command {
  static override paths = [["google-chrome", "save"]];

  static override usage = Command.Usage({
    description: "Save an object.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  in = Option.String('--in', { required: false, description: "The file in which to save the object." });
  as = Option.String('--as', { required: false, description: "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.save(this.in as any, this.as as any);

      const output = formatter.formatSuccess('save completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

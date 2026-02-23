import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Make a new object.
 */
export class MakeCommand extends Command {
  static override paths = [["arc", "make"]];

  static override usage = Command.Usage({
    description: "Make a new object.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  new = Option.String('--new', { required: true, description: "The class of the new object." });
  withProperties = Option.String('--with-properties', { required: false, description: "The initial values for properties of the object." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.make(this.new as any, this.withProperties as any);

      const output = formatter.formatSuccess('make completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

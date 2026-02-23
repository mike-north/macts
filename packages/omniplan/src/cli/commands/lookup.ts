import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Look up a task via a custom data key
 */
export class LookupCommand extends Command {
  static override paths = [["omniplan", "lookup"]];

  static override usage = Command.Usage({
    description: "Look up a task via a custom data key",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  key = Option.String('--key', { required: true, description: "Custom data key" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.lookup(this.key as any);

      const output = formatter.formatSuccess('lookup completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Duplicate one or more object(s)
 */
export class DuplicateCommand extends Command {
  static override paths = [["tv", "duplicate"]];

  static override usage = Command.Usage({
    description: "Duplicate one or more object(s)",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  to = Option.String('--to', { required: false, description: "the new location for the object(s)" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.duplicate(this.to as any);

      const output = formatter.formatSuccess('duplicate completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

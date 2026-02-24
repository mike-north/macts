import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * RollOver - Performs the action on the given person and value
 */
export class PerformActionCommand extends Command {
  static override paths = [["contacts", "perform-action"]];

  static override usage = Command.Usage({
    description: "RollOver - Performs the action on the given person and value",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  with = Option.String('--with', { required: true, description: "property that that was returned from the \"action property\" handler." });
  for = Option.String('--for', { required: true, description: "Currently selected person." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.performAction(this.with as unknown, this.for as unknown);

      const output = formatter.formatSuccess('performAction completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

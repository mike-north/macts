import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * RollOver - Determines if the rollover action should be enabled for the given person and value
 */
export class ShouldEnableActionCommand extends Command {
  static override paths = [["contacts", "should-enable-action"]];

  static override usage = Command.Usage({
    description: "RollOver - Determines if the rollover action should be enabled for the given person and value",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  with = Option.String('--with', { required: true, description: "property that that was returned from the \"action property\" handler." });
  for = Option.String('--for', { required: true, description: "Currently selected person." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.shouldEnableAction(this.with as any, this.for as any);

      const output = formatter.formatSuccess('shouldEnableAction completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

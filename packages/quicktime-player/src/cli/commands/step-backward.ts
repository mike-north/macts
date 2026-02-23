import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Step the movie backward the specified number of steps (default is 1).
 */
export class StepBackwardCommand extends Command {
  static override paths = [["quicktime-player", "step-backward"]];

  static override usage = Command.Usage({
    description: "Step the movie backward the specified number of steps (default is 1).",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  by = Option.String('--by', { required: false, description: "number of steps" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.stepBackward(this.by as any);

      const output = formatter.formatSuccess('stepBackward completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Remove working hours from a schedule
 */
export class SubtractWorkTimeCommand extends Command {
  static override paths = [["omniplan", "subtract-work-time"]];

  static override usage = Command.Usage({
    description: "Remove working hours from a schedule",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  schedule = Option.String('--schedule', { required: true, description: "Target schedule" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.subtractWorkTime(this.schedule as unknown);

      const output = formatter.formatSuccess('subtractWorkTime completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

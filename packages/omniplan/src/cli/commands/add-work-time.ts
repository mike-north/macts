import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Add working hours to a schedule
 */
export class AddWorkTimeCommand extends Command {
  static override paths = [["omniplan", "add-work-time"]];

  static override usage = Command.Usage({
    description: "Add working hours to a schedule",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  schedule = Option.String('--schedule', { required: true, description: "Target schedule" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.addWorkTime(this.schedule as any);

      const output = formatter.formatSuccess('addWorkTime completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

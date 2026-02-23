import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Assign resources to tasks
 */
export class AssignCommand extends Command {
  static override paths = [["omniplan", "assign"]];

  static override usage = Command.Usage({
    description: "Assign resources to tasks",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  resource = Option.String('--resource', { required: true, description: "Resource to assign" });
  task = Option.String('--task', { required: true, description: "Task to assign to" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.assign(this.resource as any, this.task as any);

      const output = formatter.formatSuccess('assign completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

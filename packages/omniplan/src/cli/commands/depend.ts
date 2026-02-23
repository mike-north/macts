import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Create a dependency between tasks
 */
export class DependCommand extends Command {
  static override paths = [["omniplan", "depend"]];

  static override usage = Command.Usage({
    description: "Create a dependency between tasks",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  prerequisite = Option.String('--prerequisite', { required: true, description: "Prerequisite task" });
  dependent = Option.String('--dependent', { required: true, description: "Dependent task" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.depend(this.prerequisite as any, this.dependent as any);

      const output = formatter.formatSuccess('depend completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

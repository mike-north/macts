import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Add an Automator action or variable to a workflow
 */
export class AddCommand extends Command {
  static override paths = [["automator", "add"]];

  static override usage = Command.Usage({
    description: "Add an Automator action or variable to a workflow",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  object = Option.String('--object', { required: true, description: "The Automator action or variable to add" });
  to = Option.String('--to', { required: true, description: "The workflow to which the action or variable is to be added" });
  atIndex = Option.String('--at-index', { required: false, description: "The index at which the action or variable is to be added" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.add(this.object as any, this.to as any, this.atIndex as any);

      const output = formatter.formatSuccess('add completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

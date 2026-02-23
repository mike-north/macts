import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Revert workflow configuration value to default, or delete environment variable
 */
export class RemoveConfigurationCommand extends Command {
  static override paths = [["alfred", "remove-configuration"]];

  static override usage = Command.Usage({
    description: "Revert workflow configuration value to default, or delete environment variable",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  variable = Option.String('--variable', { required: true, description: "The name of the variable" });
  inWorkflow = Option.String('--in-workflow', { required: true, description: "The workflow bundle identifier" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.removeConfiguration(this.variable as any, this.inWorkflow as any);

      const output = formatter.formatSuccess('removeConfiguration completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Run Alfred workflow trigger
 */
export class RunTriggerCommand extends Command {
  static override paths = [["alfred", "run-trigger"]];

  static override usage = Command.Usage({
    description: "Run Alfred workflow trigger",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  trigger = Option.String('--trigger', { required: true, description: "The identifier of the trigger" });
  inWorkflow = Option.String('--in-workflow', { required: true, description: "The workflow bundle identifier" });
  withArgument = Option.String('--with-argument', { required: false, description: "An optional argument" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.runTrigger(this.trigger as unknown, this.inWorkflow as unknown, this.withArgument as unknown);

      const output = formatter.formatSuccess('runTrigger completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

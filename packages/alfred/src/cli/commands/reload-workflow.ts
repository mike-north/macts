import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Reload Workflow with given UID (folder name) or Bundle ID
 */
export class ReloadWorkflowCommand extends Command {
  static override paths = [["alfred", "reload-workflow"]];

  static override usage = Command.Usage({
    description: "Reload Workflow with given UID (folder name) or Bundle ID",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflow = Option.String('--workflow', { required: true, description: "The UID (folder name), or the Bundle ID of the workflow to reload" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.reloadWorkflow(this.workflow as any);

      const output = formatter.formatSuccess('reloadWorkflow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

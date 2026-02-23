import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Reveal Workflow with given UID (folder name) or Bundle ID
 */
export class RevealWorkflowCommand extends Command {
  static override paths = [["alfred", "reveal-workflow"]];

  static override usage = Command.Usage({
    description: "Reveal Workflow with given UID (folder name) or Bundle ID",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflow = Option.String('--workflow', { required: true, description: "The UID (folder name), or the Bundle ID of the workflow to reveal" });
  configuration = Option.Boolean('--configuration', { description: "Optionally open the configuration for this workflow" });
  details = Option.Boolean('--details', { description: "Optionally open the details for this workflow" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.revealWorkflow(this.workflow as any, this.configuration as any, this.details as any);

      const output = formatter.formatSuccess('revealWorkflow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

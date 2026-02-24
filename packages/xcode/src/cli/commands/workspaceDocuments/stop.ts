import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Stop the active scheme action, if one is running
 */
export class StopWorkspaceDocumentCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "stop"]];

  static override usage = Command.Usage({
    description: "Stop the active scheme action, if one is running",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  workspaceDocumentId = Option.String({ required: true });
  workspaceName = Option.String('--workspace-name', { required: true, description: "Workspace document name" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.workspacedocuments.stop(this.workspaceName as unknown);

      const output = formatter.formatSuccess('stop completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
